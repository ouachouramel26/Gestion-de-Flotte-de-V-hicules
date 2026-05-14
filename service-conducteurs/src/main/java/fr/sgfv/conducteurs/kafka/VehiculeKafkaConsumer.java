package fr.sgfv.conducteurs.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.sgfv.conducteurs.entity.Conducteur;
import fr.sgfv.conducteurs.repository.ConducteurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@Slf4j
@RequiredArgsConstructor
public class VehiculeKafkaConsumer {

    private final ConducteurRepository conducteurRepository;
    private final ConducteurKafkaProducer conducteurKafkaProducer;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "vehicules", groupId = "conducteurs-group")
    @Transactional
    public void consumeVehiculeEvent(String message) {
        try {
            log.info(">>> [Kafka] Message reçu du service véhicules: {}", message);
            JsonNode node = objectMapper.readTree(message);
            String event = node.get("event").asText();
            
            if ("vehicule.assigned".equals(event)) {
                UUID vehiculeId = UUID.fromString(node.get("vehicule_id").asText());
                UUID conducteurId = UUID.fromString(node.get("conducteur_id").asText());
                
                log.info("Assignation détectée : véhicule {} -> conducteur {}", vehiculeId, conducteurId);
                
                // On met à jour le conducteur avec son nouveau véhicule
                conducteurRepository.findById(conducteurId).ifPresentOrElse(c -> {
                    c.setVehiculeAssigneId(vehiculeId);
                    conducteurRepository.save(c);
                    log.info("Mise à jour réussie du conducteur {} avec le véhicule {}", conducteurId, vehiculeId);
                    
                    // Informer le service d'alertes du mapping ID interne <-> ID Keycloak
                    conducteurKafkaProducer.publishConducteurAssigned(conducteurId, c.getKeycloakId(), vehiculeId, c.getPrenom(), c.getNom());
                }, () -> log.warn("Conducteur {} introuvable, impossible de synchroniser l'assignation", conducteurId));
                
                // Optionnel : Désassigner l'ancien véhicule si nécessaire ? 
                // Pour l'instant on se contente de la synchronisation directe.
            }
        } catch (Exception e) {
            log.error("Erreur lors du traitement du message véhicules: {}", e.getMessage());
        }
    }
}
