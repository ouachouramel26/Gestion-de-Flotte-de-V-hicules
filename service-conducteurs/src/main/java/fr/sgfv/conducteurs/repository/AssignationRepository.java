package fr.sgfv.conducteurs.repository;

import fr.sgfv.conducteurs.entity.Assignation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AssignationRepository extends JpaRepository<Assignation, UUID> {
    
    // Trouver l'assignation active (dateFin IS NULL) pour un véhicule donné
    @Query("SELECT a FROM Assignation a WHERE a.vehiculeId = :vehiculeId AND a.dateFin IS NULL")
    Optional<Assignation> findActiveByVehiculeId(@Param("vehiculeId") UUID vehiculeId);

    // Trouver l'assignation active d'un conducteur
    @Query("SELECT a FROM Assignation a WHERE a.conducteur.id = :conducteurId AND a.dateFin IS NULL")
    Optional<Assignation> findActiveByConducteurId(@Param("conducteurId") UUID conducteurId);
    
    // Obtenir l'historique d'un conducteur
    List<Assignation> findByConducteurId(UUID conducteurId);
}
