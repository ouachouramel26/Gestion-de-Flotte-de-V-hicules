package fr.sgfv.conducteurs.repository;

import fr.sgfv.conducteurs.entity.Conducteur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ConducteurRepository extends JpaRepository<Conducteur, UUID> {
    Optional<Conducteur> findByNumeroPermis(String numeroPermis);
    Optional<Conducteur> findByKeycloakId(String keycloakId);
    Optional<Conducteur> findFirstByEmailIgnoreCase(String email);
    Optional<Conducteur> findFirstByTelephone(String telephone);
}
