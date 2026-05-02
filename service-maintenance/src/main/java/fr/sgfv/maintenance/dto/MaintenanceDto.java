package fr.sgfv.maintenance.dto;

import fr.sgfv.maintenance.entity.MaintenanceStatut;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceDto {
    private UUID id;
    private UUID vehiculeId;
    private TechnicienDto technicien;
    private String typeIntervention;
    private String description;
    private MaintenanceStatut statut;
    private LocalDateTime datePlanifiee;
    private LocalDateTime dateDemarrage;
    private LocalDateTime dateCloture;
    private BigDecimal cout;
    private String compteRendu;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
}
