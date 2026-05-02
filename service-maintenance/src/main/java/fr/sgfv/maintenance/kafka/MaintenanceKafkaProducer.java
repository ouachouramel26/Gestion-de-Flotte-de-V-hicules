package fr.sgfv.maintenance.kafka;

import fr.sgfv.maintenance.dto.MaintenanceEvent;
import fr.sgfv.maintenance.entity.MaintenanceStatut;
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
public class MaintenanceKafkaProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.maintenance-started:maintenance}")
    private String maintenanceTopic;

    public void publishMaintenanceEvent(UUID maintenanceId, UUID vehiculeId, MaintenanceStatut statut, String eventType) {
        MaintenanceEvent event = MaintenanceEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType(eventType)
                .maintenanceId(maintenanceId)
                .vehiculeId(vehiculeId)
                .statut(statut)
                .timestamp(LocalDateTime.now())
                .build();
                
        kafkaTemplate.send(maintenanceTopic, String.valueOf(vehiculeId), event);
        log.info("Événement de maintenance publié : {} pour le véhicule {}", eventType, vehiculeId);
    }
}
