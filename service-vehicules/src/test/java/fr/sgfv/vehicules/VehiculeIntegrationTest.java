package fr.sgfv.vehicules;

import com.fasterxml.jackson.databind.ObjectMapper;
import fr.sgfv.vehicules.dto.*;
import fr.sgfv.vehicules.entity.Vehicule;
import fr.sgfv.vehicules.repository.VehiculeRepository;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.kafka.test.EmbeddedKafkaBroker;
import org.springframework.kafka.test.context.EmbeddedKafka;
import org.springframework.kafka.test.utils.KafkaTestUtils;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@EmbeddedKafka(partitions = 1, topics = {"vehicules", "conducteurs"}, brokerProperties = {"listeners=PLAINTEXT://localhost:9092", "port=9092"})
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driverClassName=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.kafka.bootstrap-servers=${spring.embedded.kafka.brokers}",
    "spring.flyway.enabled=false"
})
public class VehiculeIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private VehiculeRepository vehiculeRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Autowired
    private EmbeddedKafkaBroker embeddedKafkaBroker;

    private Consumer<String, Map<String, Object>> consumer;

    @BeforeEach
    void setUp() {
        vehiculeRepository.deleteAll();
        
        Map<String, Object> consumerProps = KafkaTestUtils.consumerProps("testGroup", "true", embeddedKafkaBroker);
        consumerProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        
        JsonDeserializer<Map<String, Object>> valueDeserializer = new JsonDeserializer<>(Map.class);
        valueDeserializer.addTrustedPackages("*");
        valueDeserializer.setUseTypeHeaders(false);
        
        DefaultKafkaConsumerFactory<String, Map<String, Object>> cf = new DefaultKafkaConsumerFactory<>(
                consumerProps, new StringDeserializer(), valueDeserializer);
        
        consumer = cf.createConsumer();
        consumer.subscribe(Collections.singleton("vehicules"));
    }

    @AfterEach
    void tearDown() {
        if (consumer != null) {
            consumer.close();
        }
    }

    @Test
    void testFullVehiculeLifecycleWithKafka() throws Exception {
        // 1. CREATE
        CreateVehiculeDTO createDto = new CreateVehiculeDTO();
        createDto.setPlaque("IT-123-ZZ");
        createDto.setMarque("Audi");
        createDto.setModele("A3");
        createDto.setAnnee(2022);
        createDto.setKilometrage(0);

        String response = mockMvc.perform(post("/vehicules")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        UUID id = UUID.fromString(objectMapper.readTree(response).get("id").asText());

        // Verify Kafka Message for CREATED
        ConsumerRecord<String, Map<String, Object>> record = KafkaTestUtils.getSingleRecord(consumer, "vehicules");
        assertThat(record.value().get("event")).isEqualTo("vehicule.created");
        assertThat(record.value().get("plaque")).isEqualTo("IT-123-ZZ");

        // 2. UPDATE
        UpdateVehiculeDTO updateDto = new UpdateVehiculeDTO();
        updateDto.setKilometrage(5000);
        
        mockMvc.perform(put("/vehicules/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kilometrage", is(5000)));

        // 3. CHANGE STATUS
        ChangerStatutDTO statutDto = new ChangerStatutDTO();
        statutDto.setStatut("EN_MISSION");

        mockMvc.perform(patch("/vehicules/" + id + "/statut")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(statutDto)))
                .andExpect(status().isOk());

        // Verify Kafka Message for STATUS CHANGED
        // We need to consume one more record
        ConsumerRecord<String, Map<String, Object>> statusRecord = KafkaTestUtils.getSingleRecord(consumer, "vehicules");
        assertThat(statusRecord.value().get("event")).isEqualTo("vehicule.status.changed");
        assertThat(statusRecord.value().get("statut_nouveau")).isEqualTo("EN_MISSION");

        // 4. ARCHIVE (DELETE)
        mockMvc.perform(delete("/vehicules/" + id))
                .andExpect(status().isOk());
        
        assertThat(vehiculeRepository.findById(id).get().getStatut()).isEqualTo("HORS_SERVICE");
    }

    @Test
    void testKafkaConsumerEvent() throws Exception {
        // Create a vehicle
        Vehicule v = Vehicule.builder()
                .plaque("KA-777-FK")
                .marque("BMW")
                .modele("X5")
                .annee(2020)
                .kilometrage(10000)
                .statut("DISPONIBLE")
                .build();
        v = vehiculeRepository.save(v);
        UUID vehiculeId = v.getId();
        UUID conducteurId = UUID.randomUUID();

        // 1. CONDUCTEUR ASSIGNED
        Map<String, Object> eventAssigned = new HashMap<>();
        eventAssigned.put("event", "conducteur.assigned");
        eventAssigned.put("vehicule_id", vehiculeId.toString());
        eventAssigned.put("conducteur_id", conducteurId.toString());

        kafkaTemplate.send("conducteurs", vehiculeId.toString(), eventAssigned);
        waitForCondition(() -> conducteurId.equals(vehiculeRepository.findById(vehiculeId).get().getConducteurAssigneId()));
        assertThat(vehiculeRepository.findById(vehiculeId).get().getConducteurAssigneId()).isEqualTo(conducteurId);

        // 2. CONDUCTEUR UNASSIGNED
        Map<String, Object> eventUnassigned = new HashMap<>();
        eventUnassigned.put("event", "conducteur.unassigned");
        eventUnassigned.put("vehicule_id", vehiculeId.toString());

        kafkaTemplate.send("conducteurs", vehiculeId.toString(), eventUnassigned);
        waitForCondition(() -> vehiculeRepository.findById(vehiculeId).get().getConducteurAssigneId() == null);
        assertThat(vehiculeRepository.findById(vehiculeId).get().getConducteurAssigneId()).isNull();

        // 3. CONDUCTEUR DEACTIVATED
        // Re-assign first
        v.setConducteurAssigneId(conducteurId);
        vehiculeRepository.save(v);

        Map<String, Object> eventDeactivated = new HashMap<>();
        eventDeactivated.put("event", "conducteur.deactivated");
        eventDeactivated.put("vehicule_assigne_id", vehiculeId.toString());

        kafkaTemplate.send("conducteurs", vehiculeId.toString(), eventDeactivated);
        waitForCondition(() -> vehiculeRepository.findById(vehiculeId).get().getConducteurAssigneId() == null);
        assertThat(vehiculeRepository.findById(vehiculeId).get().getConducteurAssigneId()).isNull();
    }

    private void waitForCondition(java.util.function.BooleanSupplier condition) throws Exception {
        long start = System.currentTimeMillis();
        while (System.currentTimeMillis() - start < 5000) {
            if (condition.getAsBoolean()) return;
            Thread.sleep(100);
        }
        throw new AssertionError("Condition not met within timeout");
    }

    @Test
    void testErrorPaths() throws Exception {
        mockMvc.perform(get("/vehicules/" + UUID.randomUUID()))
                .andExpect(status().isNotFound());

        CreateVehiculeDTO badDto = new CreateVehiculeDTO();
        badDto.setPlaque(""); 
        mockMvc.perform(post("/vehicules")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badDto)))
                .andExpect(status().isBadRequest());

        // Test PlaqueDejaExistanteException
        Vehicule v = Vehicule.builder().plaque("EXIST-123").marque("X").modele("Y").annee(2000).kilometrage(0).statut("DISPONIBLE").build();
        vehiculeRepository.save(v);
        CreateVehiculeDTO dupDto = new CreateVehiculeDTO();
        dupDto.setPlaque("EXIST-123");
        dupDto.setMarque("Renault");
        dupDto.setModele("Zoe");
        dupDto.setAnnee(2022);
        mockMvc.perform(post("/vehicules")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(dupDto)))
                .andExpect(status().isConflict());
    }
}
