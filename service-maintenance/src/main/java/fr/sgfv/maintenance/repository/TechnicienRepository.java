package fr.sgfv.maintenance.repository;

import fr.sgfv.maintenance.entity.Technicien;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TechnicienRepository extends JpaRepository<Technicien, UUID> {
    Optional<Technicien> findByKeycloakId(String keycloakId);
}
