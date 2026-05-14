package fr.sgfv.conducteurs.service;

import fr.sgfv.conducteurs.entity.Assignation;
import fr.sgfv.conducteurs.entity.Conducteur;
import fr.sgfv.conducteurs.dto.AssignationRequestDto;
import fr.sgfv.conducteurs.dto.AssignationResponseDto;
import fr.sgfv.conducteurs.dto.ConducteurDto;
import fr.sgfv.conducteurs.kafka.ConducteurKafkaProducer;
import fr.sgfv.conducteurs.repository.AssignationRepository;
import fr.sgfv.conducteurs.repository.ConducteurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AssignationService {

    private final AssignationRepository assignationRepository;
    private final ConducteurRepository conducteurRepository;
    private final ConducteurKafkaProducer kafkaPublisher;

    @Transactional
    public AssignationResponseDto assignVehicule(AssignationRequestDto request) {
        Conducteur conducteur = conducteurRepository.findById(request.getConducteurId())
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable avec l'ID: " + request.getConducteurId()));

        // 1. Validation du permis
        if (conducteur.getDateExpirationPermis().isBefore(LocalDate.now())) {
            throw new RuntimeException("Impossible d'assigner : Permis expiré");
        }
        if (conducteur.getStatutCompte() != fr.sgfv.conducteurs.entity.ConducteurStatut.ACTIF) {
            throw new RuntimeException("Impossible d'assigner : Conducteur inactif ou suspendu");
        }

        // 2. Vérifier si le véhicule est déjà assigné activement -> On termine l'ancienne au lieu de planter
        assignationRepository.findActiveByVehiculeId(request.getVehiculeId()).ifPresent(a -> {
            a.setDateFin(LocalDateTime.now());
            assignationRepository.save(a);
            log.info("Ancienne assignation terminée pour le véhicule {} (remplacement)", request.getVehiculeId());
            
            // Retirer le véhicule de l'ancien conducteur
            Conducteur oldConducteur = a.getConducteur();
            if (oldConducteur != null) {
                oldConducteur.setVehiculeAssigneId(null);
                conducteurRepository.save(oldConducteur);
            }
        });

        // 3. Vérifier si le conducteur est déjà assigné à un autre véhicule -> On termine l'ancienne au lieu de planter
        assignationRepository.findActiveByConducteurId(conducteur.getId()).ifPresent(activeAssignation -> {
            activeAssignation.setDateFin(LocalDateTime.now());
            assignationRepository.save(activeAssignation);
            log.info("Ancienne assignation terminée pour le conducteur {} (changement de véhicule)", conducteur.getId());
        });

        // 4. Créer la nouvelle assignation et mettre à jour le conducteur
        Assignation newAssignation = Assignation.builder()
                .conducteur(conducteur)
                .vehiculeId(request.getVehiculeId())
                .dateDebut(LocalDateTime.now())
                .build();

        Assignation savedAssignation = assignationRepository.save(newAssignation);
        
        conducteur.setVehiculeAssigneId(request.getVehiculeId());
        conducteurRepository.save(conducteur);

        // 5. Publier l'événement avec les deux IDs (interne pour service-vehicules, Keycloak pour service-alertes)
        kafkaPublisher.publishConducteurAssigned(conducteur.getId(), conducteur.getKeycloakId(), request.getVehiculeId(), conducteur.getPrenom(), conducteur.getNom());

        return mapToResponseDto(savedAssignation);
    }
    
    private AssignationResponseDto mapToResponseDto(Assignation assignation) {
        return AssignationResponseDto.builder()
                .id(assignation.getId())
                .conducteur(ConducteurDto.builder()
                        .id(assignation.getConducteur().getId().toString())
                        .nom(assignation.getConducteur().getNom())
                        .prenom(assignation.getConducteur().getPrenom())
                        .email(assignation.getConducteur().getEmail())
                        .telephone(assignation.getConducteur().getTelephone())
                        .numeroPermis(assignation.getConducteur().getNumeroPermis())
                        .statutCompte(assignation.getConducteur().getStatutCompte().name())
                        .disponibilite(assignation.getConducteur().getDisponibilite().name())
                        .build())
                .vehiculeId(assignation.getVehiculeId())
                .dateDebut(assignation.getDateDebut())
                .dateFin(assignation.getDateFin())
                .build();
    }
}
