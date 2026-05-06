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

    private final VehiculeKafkaProducer vehiculeKafkaProducer;

    @KafkaListener(
        topics = {"conducteurs", "maintenance"},
        groupId = "service-vehicules",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void consommer(Map<String, Object> message) {
        String eventType = (String) message.get("eventType");
        if (eventType == null) {
            log.warn("[Kafka] Message sans champ 'eventType' — ignoré");
            return;
        }

        log.info("[Kafka] Événement reçu : {}", eventType);

        switch (eventType) {
            case "CONDUCTEUR_ASSIGNED"    -> traiterAssigned(message);
            case "CONDUCTEUR_UNASSIGNED"  -> traiterUnassigned(message);
            case "CONDUCTEUR_DEACTIVATED" -> traiterDeactivated(message);
            case "MAINTENANCE_SIGNALED", "MAINTENANCE_PLANNED", "MAINTENANCE_STARTED", 
                 "MAINTENANCE_COMPLETED", "MAINTENANCE_CANCELLED" -> traiterMaintenance(message);
            default -> log.debug("[Kafka] {} ignoré par service-vehicules", eventType);
        }
    }

    private void traiterMaintenance(Map<String, Object> message) {
        try {
            String eventType = (String) message.get("eventType");
            UUID vehiculeId = UUID.fromString((String) message.get("vehiculeId"));

            vehiculeRepository.findById(vehiculeId).ifPresent(v -> {
                String statutPrecedent = v.getStatut();
                String nouveauStatut = null;

                switch (eventType) {
                    case "MAINTENANCE_SIGNALED" -> nouveauStatut = "EN_PANNE";
                    case "MAINTENANCE_PLANNED", "MAINTENANCE_STARTED" -> nouveauStatut = "EN_MAINTENANCE";
                    case "MAINTENANCE_COMPLETED", "MAINTENANCE_CANCELLED" -> nouveauStatut = "DISPONIBLE";
                }

                if (nouveauStatut != null && !nouveauStatut.equals(statutPrecedent)) {
                    log.info("[Kafka] Automate Statut : {} (véhicule {}) : {} -> {}", 
                        eventType, v.getPlaque(), statutPrecedent, nouveauStatut);
                    v.setStatut(nouveauStatut);
                    vehiculeRepository.save(v);
                    vehiculeKafkaProducer.envoyerStatutChange(v, statutPrecedent);
                }
            });
        } catch (Exception e) {
            log.error("[Kafka] Erreur traitement maintenance : {}", e.getMessage());
        }
    }

    private void traiterAssigned(Map<String, Object> message) {
        try {
            UUID vehiculeId   = UUID.fromString((String) message.get("vehiculeId"));
            UUID conducteurId = UUID.fromString((String) message.get("conducteurId"));

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
            UUID vehiculeId = UUID.fromString((String) message.get("vehiculeId"));

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