package fr.sgfv.conducteurs.service;

import fr.sgfv.conducteurs.entity.Conducteur;
import fr.sgfv.conducteurs.dto.ConducteurDto;
import fr.sgfv.conducteurs.kafka.ConducteurKafkaProducer;
import fr.sgfv.conducteurs.repository.ConducteurRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;
import java.time.LocalDate;

@Slf4j
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

        Conducteur conducteur = Conducteur.builder()
                .keycloakId(realKeycloakId)
                .nom(dto.getNom())
                .prenom(dto.getPrenom())
                .email(dto.getEmail())
                .telephone(dto.getTelephone())
                .numeroPermis(dto.getNumeroPermis())
                .dateExpirationPermis(parseDate(dto.getDateExpirationPermis()))
                .statutCompte(dto.getStatutCompte() != null ? fr.sgfv.conducteurs.entity.ConducteurStatut.valueOf(dto.getStatutCompte()) : fr.sgfv.conducteurs.entity.ConducteurStatut.ACTIF)
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
        if (dto.getDateExpirationPermis() != null && !dto.getDateExpirationPermis().isEmpty()) {
            try {
                conducteur.setDateExpirationPermis(LocalDate.parse(dto.getDateExpirationPermis()));
            } catch (Exception e) {
                log.warn("Format de date invalide pour conducteur {} : {}", id, dto.getDateExpirationPermis());
            }
        }

        Conducteur saved = conducteurRepository.save(conducteur);
        return mapToDto(saved);
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return LocalDate.now().plusYears(1); // Valeur par défaut si vide
        }
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return LocalDate.now().plusYears(1);
        }
    }

    @Transactional
    public ConducteurDto changeStatut(UUID id, fr.sgfv.conducteurs.entity.ConducteurStatut statut) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));

        conducteur.setStatutCompte(statut);
        Conducteur saved = conducteurRepository.save(conducteur);
        return mapToDto(saved);
    }

    @Transactional
    public ConducteurDto changeDisponibilite(UUID id, fr.sgfv.conducteurs.entity.Disponibilite disponibilite) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));

        conducteur.setDisponibilite(disponibilite);
        Conducteur saved = conducteurRepository.save(conducteur);
        return mapToDto(saved);
    }

    @Transactional
    public ConducteurDto deactivateConducteur(UUID id) {
        Conducteur conducteur = conducteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conducteur introuvable"));

        conducteur.setStatutCompte(fr.sgfv.conducteurs.entity.ConducteurStatut.SUSPENDU);
        Conducteur saved = conducteurRepository.save(conducteur);
        return mapToDto(saved);
    }

    private ConducteurDto mapToDto(Conducteur conducteur) {
        return ConducteurDto.builder()
                .id(conducteur.getId().toString())
                .keycloakId(conducteur.getKeycloakId())
                .nom(conducteur.getNom())
                .prenom(conducteur.getPrenom())
                .email(conducteur.getEmail())
                .telephone(conducteur.getTelephone())
                .numeroPermis(conducteur.getNumeroPermis())
                .dateExpirationPermis(conducteur.getDateExpirationPermis().toString())
                .vehiculeAssigneId(conducteur.getVehiculeAssigneId() != null ? conducteur.getVehiculeAssigneId().toString() : null)
                .statutCompte(conducteur.getStatutCompte().name())
                .disponibilite(conducteur.getDisponibilite().name())
                .dateCreation(conducteur.getDateCreation() != null ? conducteur.getDateCreation().toString() : null)
                .build();
    }
}
