package fr.sgfv.maintenance.service;

import fr.sgfv.maintenance.dto.*;
import fr.sgfv.maintenance.entity.Maintenance;
import fr.sgfv.maintenance.entity.MaintenanceStatut;
import fr.sgfv.maintenance.entity.Technicien;
import fr.sgfv.maintenance.kafka.MaintenanceKafkaProducer;
import fr.sgfv.maintenance.repository.MaintenanceRepository;
import fr.sgfv.maintenance.repository.TechnicienRepository;
import fr.sgfv.maintenance.repository.VehiculeCacheRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final TechnicienRepository technicienRepository;
    private final VehiculeCacheRepository vehiculeCacheRepository;
    private final MaintenanceKafkaProducer kafkaProducer;

    @Transactional(readOnly = true)
    public List<MaintenanceDto> getAllMaintenances() {
        return maintenanceRepository.findAll().stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MaintenanceDto getMaintenanceById(UUID id) {
        return mapToDto(maintenanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Maintenance introuvable")));
    }

    @Transactional
    public MaintenanceDto signalerMaintenance(MaintenanceRequestDto dto) {
        // Validation que le véhicule existe en cache
        vehiculeCacheRepository.findById(dto.getVehiculeId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Véhicule introuvable dans le cache de maintenance. Veuillez vous assurer que le véhicule existe dans le service-vehicules."));

        Maintenance maintenance = Maintenance.builder()
                .vehiculeId(dto.getVehiculeId())
                .typeIntervention(dto.getTypeIntervention())
                .description(dto.getDescription())
                .statut(MaintenanceStatut.SIGNALEE)
                .build();

        Maintenance saved = maintenanceRepository.save(maintenance);
        kafkaProducer.publishMaintenanceEvent(saved.getId(), saved.getVehiculeId(), saved.getStatut(), "MAINTENANCE_SIGNALED");
        return mapToDto(saved);
    }

    @Transactional
    public MaintenanceDto planifierMaintenance(UUID id, MaintenancePlanifierDto dto) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Maintenance introuvable"));

        if (maintenance.getStatut() != MaintenanceStatut.SIGNALEE) {
            throw new RuntimeException("La maintenance doit être à l'état SIGNALEE pour être planifiée");
        }

        Technicien technicien = technicienRepository.findById(dto.getTechnicienId())
                .orElseThrow(() -> new RuntimeException("Technicien introuvable"));

        maintenance.setTechnicien(technicien);
        maintenance.setDatePlanifiee(dto.getDatePlanifiee());
        maintenance.setStatut(MaintenanceStatut.PLANIFIEE);

        Maintenance saved = maintenanceRepository.save(maintenance);
        kafkaProducer.publishMaintenanceEvent(saved.getId(), saved.getVehiculeId(), saved.getStatut(), "MAINTENANCE_PLANNED");
        return mapToDto(saved);
    }

    @Transactional
    public MaintenanceDto demarrerMaintenance(UUID id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Maintenance introuvable"));

        if (maintenance.getStatut() != MaintenanceStatut.PLANIFIEE) {
            throw new RuntimeException("La maintenance doit être à l'état PLANIFIEE pour démarrer");
        }

        maintenance.setDateDemarrage(LocalDateTime.now());
        maintenance.setStatut(MaintenanceStatut.EN_COURS);

        Maintenance saved = maintenanceRepository.save(maintenance);
        kafkaProducer.publishMaintenanceEvent(saved.getId(), saved.getVehiculeId(), saved.getStatut(), "MAINTENANCE_STARTED");
        return mapToDto(saved);
    }

    @Transactional
    public MaintenanceDto cloturerMaintenance(UUID id, MaintenanceCloturerDto dto) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Maintenance introuvable"));

        if (maintenance.getStatut() != MaintenanceStatut.EN_COURS) {
            throw new RuntimeException("La maintenance doit être EN_COURS pour être clôturée");
        }

        maintenance.setCout(dto.getCout());
        maintenance.setCompteRendu(dto.getCompteRendu());
        maintenance.setDateCloture(LocalDateTime.now());
        maintenance.setStatut(MaintenanceStatut.TERMINEE);

        Maintenance saved = maintenanceRepository.save(maintenance);
        kafkaProducer.publishMaintenanceEvent(saved.getId(), saved.getVehiculeId(), saved.getStatut(), "MAINTENANCE_COMPLETED");
        
        // Technicien repasse DISPONIBLE ? Hors scope direct si non géré ici, 
        // mais pourrions mettre technicien.disponibilite=DISPONIBLE.
        return mapToDto(saved);
    }

    @Transactional
    public MaintenanceDto annulerMaintenance(UUID id) {
        Maintenance maintenance = maintenanceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Maintenance introuvable"));

        // Vérifier que la maintenance n'est pas déjà terminée ou annulée
        if (maintenance.getStatut() == MaintenanceStatut.TERMINEE || 
            maintenance.getStatut() == MaintenanceStatut.ANNULEE) {
            throw new RuntimeException("Impossible d'annuler une maintenance " + maintenance.getStatut().name());
        }

        maintenance.setStatut(MaintenanceStatut.ANNULEE);
        Maintenance saved = maintenanceRepository.save(maintenance);
        kafkaProducer.publishMaintenanceEvent(saved.getId(), saved.getVehiculeId(), saved.getStatut(), "MAINTENANCE_CANCELLED");
        return mapToDto(saved);
    }

    private MaintenanceDto mapToDto(Maintenance m) {
        TechnicienDto technicienDto = null;
        if (m.getTechnicien() != null) {
            technicienDto = TechnicienDto.builder()
                    .id(m.getTechnicien().getId())
                    .keycloakId(m.getTechnicien().getKeycloakId())
                    .nom(m.getTechnicien().getNom())
                    .prenom(m.getTechnicien().getPrenom())
                    .disponibilite(m.getTechnicien().getDisponibilite())
                    .build();
        }

        return MaintenanceDto.builder()
                .id(m.getId())
                .vehiculeId(m.getVehiculeId())
                .technicien(technicienDto)
                .typeIntervention(m.getTypeIntervention())
                .description(m.getDescription())
                .statut(m.getStatut())
                .datePlanifiee(m.getDatePlanifiee())
                .dateDemarrage(m.getDateDemarrage())
                .dateCloture(m.getDateCloture())
                .cout(m.getCout())
                .compteRendu(m.getCompteRendu())
                .dateCreation(m.getDateCreation())
                .dateModification(m.getDateModification())
                .build();
    }
}
