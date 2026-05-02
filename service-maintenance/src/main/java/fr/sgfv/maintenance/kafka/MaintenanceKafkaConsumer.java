package fr.sgfv.maintenance.kafka;


import fr.sgfv.maintenance.entity.Technicien;
import fr.sgfv.maintenance.entity.VehiculeCache;
import fr.sgfv.maintenance.repository.TechnicienRepository;
import fr.sgfv.maintenance.repository.VehiculeCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.UUID;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaintenanceKafkaConsumer {

    private final VehiculeCacheRepository vehiculeRepository;
    private final TechnicienRepository technicienRepository;

    @KafkaListener(topics = "${kafka.topics.vehicules-consumed:vehicules}", groupId = "${spring.kafka.consumer.group-id}")
    public void consumeVehiculeEvent(java.util.Map<String, Object> message) {
        String event = (String) message.get("event");
        log.info("Réception événement véhicule Kafka : {}", event);
        
        Object vehiculeIdObj = message.get("vehicule_id");
        if (vehiculeIdObj != null) {
            UUID vehiculeId = UUID.fromString(vehiculeIdObj.toString());
            VehiculeCache vehicule = vehiculeRepository.findById(vehiculeId)
                    .orElseGet(() -> VehiculeCache.builder().vehiculeId(vehiculeId).build());
            
            if (message.get("plaque") != null) {
                vehicule.setPlaque(message.get("plaque").toString());
            }
            
            // Gestion du statut (soit 'statut', soit 'statut_nouveau')
            Object statutObj = message.get("statut");
            if (statutObj == null) statutObj = message.get("statut_nouveau");
            
            if (statutObj != null) {
                try {
                    vehicule.setStatut(fr.sgfv.maintenance.entity.VehiculeStatut.valueOf(statutObj.toString()));
                } catch (Exception e) {
                    log.warn("Statut inconnu : {}", statutObj);
                }
            }
            
            vehiculeRepository.save(vehicule);
            log.info("Cache véhicule mis à jour pour {}", vehiculeId);
        }
    }

    @KafkaListener(topics = "${kafka.topics.utilisateurs-consumed:utilisateurs}", groupId = "${spring.kafka.consumer.group-id}")
    public void consumeTechnicienEvent(java.util.Map<String, Object> message) {
        String event = (String) message.get("event");
        log.info("Réception événement utilisateur Kafka : {}", event);
        
        Object techIdObj = message.get("technicien_id");
        Object keycloakIdObj = message.get("keycloak_id");
        
        if (techIdObj != null && keycloakIdObj != null) {
            UUID techId = UUID.fromString(techIdObj.toString());
            Technicien technicien = technicienRepository.findById(techId)
                    .orElseGet(() -> Technicien.builder().id(techId).build());
            
            technicien.setKeycloakId(keycloakIdObj.toString());
            if (message.get("nom") != null) technicien.setNom(message.get("nom").toString());
            if (message.get("prenom") != null) technicien.setPrenom(message.get("prenom").toString());
            
            Object dispoObj = message.get("disponibilite");
            if (dispoObj != null) {
                try {
                    technicien.setDisponibilite(fr.sgfv.maintenance.entity.TechnicienDisponibilite.valueOf(dispoObj.toString()));
                } catch (Exception e) {
                    log.warn("Disponibilité inconnue : {}", dispoObj);
                }
            }
            
            technicienRepository.save(technicien);
            log.info("Technicien mis à jour/créé : {}", techId);
        }
    }
}
