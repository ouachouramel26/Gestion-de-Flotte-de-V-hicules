package fr.sgfv.maintenance.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "vehicules_cache")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VehiculeCache {

    @Id
    @Column(name = "vehicule_id")
    private UUID vehiculeId;

    @Column(nullable = false, length = 20)
    private String plaque;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VehiculeStatut statut;

    @UpdateTimestamp
    @Column(name = "date_sync", nullable = false)
    @Builder.Default
    private LocalDateTime dateSync = LocalDateTime.now();
}
