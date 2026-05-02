package fr.sgfv.vehicules.kafka;

import fr.sgfv.vehicules.repository.VehiculeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ConducteurKafkaConsumer {

    private final VehiculeRepository vehiculeRepository;

    @KafkaListener(
        topics = "conducteurs",
        groupId = "service-vehicules",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void consommer(Map<String, Object> message) {
        String event = (String) message.get("event");
        if (event == null) {
            log.warn("[Kafka] Message sans champ 'event' — ignoré");
            return;
        }

        log.info("[Kafka] Événement reçu : {}", event);

        switch (event) {
            case "conducteur.assigned"    -> traiterAssigned(message);
            case "conducteur.unassigned"  -> traiterUnassigned(message);
            case "conducteur.deactivated" -> traiterDeactivated(message);
            default -> log.debug("[Kafka] {} ignoré par service-vehicules", event);
        }
    }

    private void traiterAssigned(Map<String, Object> message) {
        try {
            UUID vehiculeId   = UUID.fromString((String) message.get("vehicule_id"));
            UUID conducteurId = UUID.fromString((String) message.get("conducteur_id"));

            vehiculeRepository.findById(vehiculeId).ifPresentOrElse(
                v -> {
                    v.setConducteurAssigneId(conducteurId);
                    vehiculeRepository.save(v);
                    log.info("[Kafka] conducteur.assigned — véhicule {} → conducteur {}",
                        vehiculeId, conducteurId);
                },
                () -> log.warn("[Kafka] conducteur.assigned — véhicule {} introuvable",
                    vehiculeId)
            );
        } catch (Exception e) {
            log.error("[Kafka] Erreur conducteur.assigned : {}", e.getMessage());
        }
    }

    private void traiterUnassigned(Map<String, Object> message) {
        try {
            UUID vehiculeId = UUID.fromString((String) message.get("vehicule_id"));

            vehiculeRepository.findById(vehiculeId).ifPresentOrElse(
                v -> {
                    v.setConducteurAssigneId(null);
                    vehiculeRepository.save(v);
                    log.info("[Kafka] conducteur.unassigned — véhicule {} libéré",
                        vehiculeId);
                },
                () -> log.warn("[Kafka] conducteur.unassigned — véhicule {} introuvable",
                    vehiculeId)
            );
        } catch (Exception e) {
            log.error("[Kafka] Erreur conducteur.unassigned : {}", e.getMessage());
        }
    }

    private void traiterDeactivated(Map<String, Object> message) {
        try {
            Object vehiculeIdObj = message.get("vehicule_assigne_id");
            if (vehiculeIdObj == null) {
                log.debug("[Kafka] conducteur.deactivated — aucun véhicule assigné");
                return;
            }

            UUID vehiculeId = UUID.fromString((String) vehiculeIdObj);

            vehiculeRepository.findById(vehiculeId).ifPresentOrElse(
                v -> {
                    v.setConducteurAssigneId(null);
                    vehiculeRepository.save(v);
                    log.info("[Kafka] conducteur.deactivated — véhicule {} libéré",
                        vehiculeId);
                },
                () -> log.warn("[Kafka] conducteur.deactivated — véhicule {} introuvable",
                    vehiculeId)
            );
        } catch (Exception e) {
            log.error("[Kafka] Erreur conducteur.deactivated : {}", e.getMessage());
        }
    }
}