package fr.sgfv.vehicules.kafka;

import fr.sgfv.vehicules.entity.Vehicule;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class VehiculeKafkaProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${kafka.topics.vehicule-created}")
    private String topicVehicules;

    public void envoyerVehiculeCreated(Vehicule vehicule) {
        Map<String, Object> event = new HashMap<>();
        event.put("event", "vehicule.created");
        event.put("vehicule_id", vehicule.getId().toString());
        event.put("plaque", vehicule.getPlaque());
        event.put("marque", vehicule.getMarque());
        event.put("modele", vehicule.getModele());
        event.put("annee", vehicule.getAnnee());
        event.put("statut", vehicule.getStatut());
        event.put("horodatage", Instant.now().toString());
        envoyer(vehicule.getId().toString(), event, "vehicule.created");
    }

    public void envoyerStatutChange(Vehicule vehicule, String statutPrecedent) {
        Map<String, Object> event = new HashMap<>();
        event.put("event", "vehicule.status.changed");
        event.put("vehicule_id", vehicule.getId().toString());
        event.put("plaque", vehicule.getPlaque());
        event.put("statut_precedent", statutPrecedent);
        event.put("statut_nouveau", vehicule.getStatut());
        event.put("horodatage", Instant.now().toString());
        envoyer(vehicule.getId().toString(), event, "vehicule.status.changed");
    }

    public void envoyerVehiculeAssigned(Vehicule vehicule) {
        Map<String, Object> event = new HashMap<>();
        event.put("event", "vehicule.assigned");
        event.put("vehicule_id", vehicule.getId().toString());
        event.put("conducteur_id", vehicule.getConducteurAssigneId().toString());
        event.put("horodatage", Instant.now().toString());
        envoyer(vehicule.getId().toString(), event, "vehicule.assigned");
    }

    public void envoyerVehiculeArchived(Vehicule vehicule) {
        Map<String, Object> event = new HashMap<>();
        event.put("event", "vehicule.archived");
        event.put("vehicule_id", vehicule.getId().toString());
        event.put("plaque", vehicule.getPlaque());
        event.put("horodatage", Instant.now().toString());
        envoyer(vehicule.getId().toString(), event, "vehicule.archived");
    }

    private void envoyer(String key, Map<String, Object> event, String typeEvent) {
        kafkaTemplate.send(topicVehicules, key, event)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("[Kafka] Échec envoi {} : {}", typeEvent, ex.getMessage());
                } else {
                    log.info("[Kafka] {} envoyé — partition={} offset={}",
                        typeEvent,
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
                }
            });
    }
}