package fr.sgfv.conducteurs.kafka;

import fr.sgfv.conducteurs.dto.ConducteurEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConducteurKafkaProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.conducteur-assigned}")
    private String rubriqueAssigned;
    
    @Value("${kafka.topics.conducteur-created}")
    private String rubriqueCreated;

    public void publishConducteurAssigned(Long conducteurId, Long vehiculeId) {
        ConducteurEvent event = ConducteurEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("CONDUCTEUR_ASSIGNED")
                .conducteurId(conducteurId)
                .vehiculeId(vehiculeId)
                .timestamp(LocalDateTime.now())
                .build();
                
        // Key is vehicleId so events for the same vehicle are ordered
        kafkaTemplate.send(rubriqueAssigned, String.valueOf(vehiculeId), event);
        log.info("Message d'assignation envoyé pour véhicule {} et conducteur {}", vehiculeId, conducteurId);
    }
    
    public void publishConducteurCreated(Long conducteurId) {
        ConducteurEvent event = ConducteurEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("CONDUCTEUR_CREATED")
                .conducteurId(conducteurId)
                .timestamp(LocalDateTime.now())
                .build();
                
        kafkaTemplate.send(rubriqueCreated, String.valueOf(conducteurId), event);
        log.info("Message de création envoyé pour conducteur {}", conducteurId);
    }
}
