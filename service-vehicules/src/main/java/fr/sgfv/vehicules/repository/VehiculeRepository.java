package fr.sgfv.vehicules.repository;

import fr.sgfv.vehicules.entity.Vehicule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehiculeRepository extends JpaRepository<Vehicule, UUID> {

    boolean existsByPlaque(String plaque);
    boolean existsByPlaqueAndIdNot(String plaque, UUID id);
    Optional<Vehicule> findByPlaque(String plaque);
    List<Vehicule> findByStatut(String statut);
    List<Vehicule> findByMarqueIgnoreCase(String marque);
    List<Vehicule> findByStatutAndMarqueIgnoreCase(String statut, String marque);
}