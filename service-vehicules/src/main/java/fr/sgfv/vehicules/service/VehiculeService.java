package fr.sgfv.vehicules.service;

import fr.sgfv.vehicules.dto.*;
import fr.sgfv.vehicules.entity.Vehicule;
import fr.sgfv.vehicules.exception.*;
import fr.sgfv.vehicules.kafka.VehiculeKafkaProducer;
import fr.sgfv.vehicules.repository.VehiculeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class VehiculeService {

    private final VehiculeRepository vehiculeRepository;
    private final VehiculeKafkaProducer kafkaProducer;

    private static final Map<String, List<String>> TRANSITIONS = Map.of(
        "DISPONIBLE",     List.of("EN_MISSION", "EN_MAINTENANCE", "EN_PANNE"),
        "EN_MISSION",     List.of("DISPONIBLE", "EN_PANNE"),
        "EN_MAINTENANCE", List.of("DISPONIBLE"),
        "EN_PANNE",       List.of("EN_MAINTENANCE", "HORS_SERVICE"),
        "HORS_SERVICE",   List.of()
    );

    public List<VehiculeDTO> listerVehicules(String statut, String marque) {
        List<Vehicule> vehicules;
        if (statut != null && marque != null) {
            vehicules = vehiculeRepository.findByStatutAndMarqueIgnoreCase(statut, marque);
        } else if (statut != null) {
            vehicules = vehiculeRepository.findByStatut(statut);
        } else if (marque != null) {
            vehicules = vehiculeRepository.findByMarqueIgnoreCase(marque);
        } else {
            vehicules = vehiculeRepository.findAll();
        }
        return vehicules.stream().map(this::toDTO).toList();
    }

    public VehiculeDTO getVehicule(UUID id) {
        return toDTO(findById(id));
    }

    @Transactional
    public VehiculeDTO creerVehicule(CreateVehiculeDTO dto) {
        if (vehiculeRepository.existsByPlaque(dto.getPlaque())) {
            throw new PlaqueDejaExistanteException(dto.getPlaque());
        }
        Vehicule vehicule = Vehicule.builder()
            .plaque(dto.getPlaque())
            .marque(dto.getMarque())
            .modele(dto.getModele())
            .annee(dto.getAnnee())
            .kilometrage(dto.getKilometrage() != null ? dto.getKilometrage() : 0)
            .statut("DISPONIBLE")
            .build();
        Vehicule saved = vehiculeRepository.save(vehicule);
        kafkaProducer.envoyerVehiculeCreated(saved);
        return toDTO(saved);
    }

    @Transactional
    public VehiculeDTO modifierVehicule(UUID id, UpdateVehiculeDTO dto) {
        Vehicule vehicule = findById(id);
        if ("HORS_SERVICE".equals(vehicule.getStatut())) {
            throw new VehiculeHorsServiceException();
        }
        if (dto.getKilometrage() != null &&
            dto.getKilometrage() < vehicule.getKilometrage()) {
            throw new KilometrageInvalideException(
                vehicule.getKilometrage(), dto.getKilometrage());
        }
        if (dto.getMarque() != null)      vehicule.setMarque(dto.getMarque());
        if (dto.getModele() != null)      vehicule.setModele(dto.getModele());
        if (dto.getAnnee() != null)       vehicule.setAnnee(dto.getAnnee());
        if (dto.getKilometrage() != null) vehicule.setKilometrage(dto.getKilometrage());
        return toDTO(vehiculeRepository.save(vehicule));
    }

    @Transactional
    public VehiculeDTO changerStatut(UUID id, ChangerStatutDTO dto) {
        Vehicule vehicule = findById(id);
        String statutActuel = vehicule.getStatut();
        String nouveauStatut = dto.getStatut();
        if (!TRANSITIONS.get(statutActuel).contains(nouveauStatut)) {
            throw new TransitionStatutInvalideException(statutActuel, nouveauStatut);
        }
        String statutPrecedent = vehicule.getStatut();
        vehicule.setStatut(nouveauStatut);
        Vehicule saved = vehiculeRepository.save(vehicule);
        kafkaProducer.envoyerStatutChange(saved, statutPrecedent);
        return toDTO(saved);
    }

    @Transactional
    public VehiculeDTO assignerConducteur(UUID id, AssignerVehiculeDTO dto) {
        Vehicule vehicule = findById(id);
        if (!"DISPONIBLE".equals(vehicule.getStatut())) {
            throw new IllegalStateException(
                "Le véhicule doit être DISPONIBLE pour être assigné");
        }
        vehicule.setConducteurAssigneId(dto.getConducteurId());
        Vehicule saved = vehiculeRepository.save(vehicule);
        kafkaProducer.envoyerVehiculeAssigned(saved);
        return toDTO(saved);
    }

    @Transactional
    public VehiculeDTO archiverVehicule(UUID id) {
        Vehicule vehicule = findById(id);
        vehicule.setStatut("HORS_SERVICE");
        vehicule.setConducteurAssigneId(null);
        Vehicule saved = vehiculeRepository.save(vehicule);
        kafkaProducer.envoyerVehiculeArchived(saved);
        return toDTO(saved);
    }

    private Vehicule findById(UUID id) {
        return vehiculeRepository.findById(id)
            .orElseThrow(() -> new VehiculeNotFoundException(id));
    }

    private VehiculeDTO toDTO(Vehicule v) {
        return VehiculeDTO.builder()
            .id(v.getId())
            .plaque(v.getPlaque())
            .marque(v.getMarque())
            .modele(v.getModele())
            .annee(v.getAnnee())
            .kilometrage(v.getKilometrage())
            .statut(v.getStatut())
            .conducteurAssigneId(v.getConducteurAssigneId())
            .dateAjout(v.getDateAjout())
            .dateModification(v.getDateModification())
            .build();
    }
}