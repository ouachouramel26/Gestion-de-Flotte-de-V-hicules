package fr.sgfv.maintenance.repository;

import fr.sgfv.maintenance.entity.VehiculeCache;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VehiculeCacheRepository extends JpaRepository<VehiculeCache, UUID> {
}
