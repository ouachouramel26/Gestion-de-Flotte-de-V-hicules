package fr.sgfv.maintenance.repository;

import fr.sgfv.maintenance.entity.Maintenance;
import fr.sgfv.maintenance.entity.MaintenanceStatut;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MaintenanceRepository extends JpaRepository<Maintenance, UUID> {
    List<Maintenance> findByVehiculeId(UUID vehiculeId);
    List<Maintenance> findByStatut(MaintenanceStatut statut);
    List<Maintenance> findByTechnicienId(UUID technicienId);
}
