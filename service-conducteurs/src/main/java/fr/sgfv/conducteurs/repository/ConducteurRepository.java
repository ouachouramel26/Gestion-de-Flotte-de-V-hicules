package fr.sgfv.conducteurs.repository;

import fr.sgfv.conducteurs.entity.Conducteur;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ConducteurRepository extends JpaRepository<Conducteur, Long> {
    Optional<Conducteur> findByNumeroPermis(String numeroPermis);
}
