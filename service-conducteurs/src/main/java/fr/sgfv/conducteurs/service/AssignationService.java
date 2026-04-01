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
        if (conducteur.getStatut() != fr.sgfv.conducteurs.entity.ConducteurStatut.ACTIF) {
            throw new RuntimeException("Impossible d'assigner : Conducteur inactif ou suspendu");
        }

        // 2. Vérifier si le véhicule est déjà assigné activement
        assignationRepository.findActiveByVehiculeId(request.getVehiculeId()).ifPresent(a -> {
            throw new RuntimeException("Ce véhicule est déjà assigné à un autre conducteur de manière active");
        });

        // 3. Fermer l'ancienne assignation du conducteur (s'il avait déjà un véhicule)
        assignationRepository.findActiveByConducteurId(conducteur.getId()).ifPresent(activeAssignation -> {
            activeAssignation.setDateFin(LocalDateTime.now());
            assignationRepository.save(activeAssignation);
            log.info("Ancienne assignation terminée pour le conducteur {}", conducteur.getId());
        });

        // 4. Créer la nouvelle assignation
        Assignation newAssignation = Assignation.builder()
                .conducteur(conducteur)
                .vehiculeId(request.getVehiculeId())
                .dateDebut(LocalDateTime.now())
                .build();

        Assignation savedAssignation = assignationRepository.save(newAssignation);

        // 5. Publier l'événement au bus Kafka pour que service-vehicules se mette à jour ("Saga pattern" chorégraphié)
        kafkaPublisher.publishConducteurAssigned(conducteur.getId(), request.getVehiculeId());

        return mapToResponseDto(savedAssignation);
    }
    
    private AssignationResponseDto mapToResponseDto(Assignation assignation) {
        return AssignationResponseDto.builder()
                .id(assignation.getId())
                .conducteur(ConducteurDto.builder()
                        .id(assignation.getConducteur().getId())
                        .nom(assignation.getConducteur().getNom())
                        .prenom(assignation.getConducteur().getPrenom())
                        .numeroPermis(assignation.getConducteur().getNumeroPermis())
                        .statut(assignation.getConducteur().getStatut())
                        .build())
                .vehiculeId(assignation.getVehiculeId())
                .dateDebut(assignation.getDateDebut())
                .dateFin(assignation.getDateFin())
                .build();
    }
}
