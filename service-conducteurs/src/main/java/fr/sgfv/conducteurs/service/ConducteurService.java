package fr.sgfv.conducteurs.service;

import fr.sgfv.conducteurs.entity.Conducteur;
import fr.sgfv.conducteurs.dto.ConducteurDto;
import fr.sgfv.conducteurs.kafka.ConducteurKafkaProducer;
import fr.sgfv.conducteurs.repository.ConducteurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConducteurService {

    private final ConducteurRepository conducteurRepository;
    private final ConducteurKafkaProducer kafkaPublisher;
    private final KeycloakService keycloakService;

    @Transactional(readOnly = true)
    public List<ConducteurDto> getAllConducteurs() {
        return conducteurRepository.findAll()
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ConducteurDto getConducteurById(UUID id) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));
        return mapToDto(conducteur);
    }

    @Transactional(readOnly = true)
    public ConducteurDto getConducteurByKeycloakId(String keycloakId) {
        Conducteur conducteur = conducteurRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new RuntimeException("Profil conducteur introuvable pour cet utilisateur"));
        return mapToDto(conducteur);
    }

    @Transactional
    public ConducteurDto createConducteur(ConducteurDto dto) {
        if (conducteurRepository.findByNumeroPermis(dto.getNumeroPermis()).isPresent()) {
            throw new RuntimeException("Un conducteur avec ce permis existe déjà");
        }

        // 1. Création automatique du compte dans Keycloak
        String realKeycloakId;
        try {
            realKeycloakId = keycloakService.createKeycloakUser(
                    dto.getPrenom(),
                    dto.getNom(),
                    dto.getEmail(),
                    "sgfv2026"
            );
        } catch (Exception e) {
            throw new RuntimeException("Erreur Keycloak : " + e.getMessage());
        }

        // 2. Enregistrement en base de données avec le vrai keycloakId
        Conducteur conducteur = Conducteur.builder()
                .keycloakId(realKeycloakId)
                .nom(dto.getNom())
                .prenom(dto.getPrenom())
                .email(dto.getEmail())
                .telephone(dto.getTelephone())
                .numeroPermis(dto.getNumeroPermis())
                .dateExpirationPermis(dto.getDateExpirationPermis())
                .statutCompte(dto.getStatutCompte() != null ? dto.getStatutCompte() : fr.sgfv.conducteurs.entity.ConducteurStatut.ACTIF)
                .disponibilite(fr.sgfv.conducteurs.entity.Disponibilite.DISPONIBLE)
                .build();

        Conducteur savedConducteur = conducteurRepository.save(conducteur);
        
        kafkaPublisher.publishConducteurCreated(savedConducteur.getId(), savedConducteur.getKeycloakId());
        
        return mapToDto(savedConducteur);
    }

    @Transactional
    public ConducteurDto updateConducteur(UUID id, ConducteurDto dto) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));

        if (dto.getNom() != null) conducteur.setNom(dto.getNom());
        if (dto.getPrenom() != null) conducteur.setPrenom(dto.getPrenom());
        if (dto.getEmail() != null) conducteur.setEmail(dto.getEmail());
        if (dto.getTelephone() != null) conducteur.setTelephone(dto.getTelephone());
        if (dto.getNumeroPermis() != null) conducteur.setNumeroPermis(dto.getNumeroPermis());
        if (dto.getDateExpirationPermis() != null) conducteur.setDateExpirationPermis(dto.getDateExpirationPermis());

        Conducteur saved = conducteurRepository.save(conducteur);
        // kafkaPublisher.publishConducteurUpdated(saved.getId()); 
        return mapToDto(saved);
    }

    @Transactional
    public ConducteurDto changeStatut(UUID id, fr.sgfv.conducteurs.entity.ConducteurStatut statut) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));

        conducteur.setStatutCompte(statut);
        Conducteur saved = conducteurRepository.save(conducteur);
        // kafkaPublisher.publishConducteurStatusChanged(saved.getId(), statut.name());
        return mapToDto(saved);
    }

    @Transactional
    public ConducteurDto changeDisponibilite(UUID id, fr.sgfv.conducteurs.entity.Disponibilite disponibilite) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));

        conducteur.setDisponibilite(disponibilite);
        Conducteur saved = conducteurRepository.save(conducteur);
        // kafkaPublisher.publishConducteurAvailabilityChanged(saved.getId(), disponibilite.name());
        return mapToDto(saved);
    }

    @Transactional
    public ConducteurDto deactivateConducteur(UUID id) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));

        conducteur.setStatutCompte(fr.sgfv.conducteurs.entity.ConducteurStatut.SUSPENDU);
        Conducteur saved = conducteurRepository.save(conducteur);
        // kafkaPublisher.publishConducteurDeactivated(saved.getId());
        return mapToDto(saved);
    }

    private ConducteurDto mapToDto(Conducteur conducteur) {
        return ConducteurDto.builder()
                .id(conducteur.getId())
                .keycloakId(conducteur.getKeycloakId())
                .nom(conducteur.getNom())
                .prenom(conducteur.getPrenom())
                .email(conducteur.getEmail())
                .telephone(conducteur.getTelephone())
                .numeroPermis(conducteur.getNumeroPermis())
                .dateExpirationPermis(conducteur.getDateExpirationPermis())
                .vehiculeAssigneId(conducteur.getVehiculeAssigneId())
                .statutCompte(conducteur.getStatutCompte())
                .disponibilite(conducteur.getDisponibilite())
                .build();
    }
}
