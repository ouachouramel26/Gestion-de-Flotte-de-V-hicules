package fr.sgfv.maintenance.dto;

import fr.sgfv.maintenance.entity.MaintenanceStatut;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MaintenanceEvent {
    private String eventId;
    private String eventType;
    private UUID maintenanceId;
    private UUID vehiculeId;
    private MaintenanceStatut statut;
    private LocalDateTime timestamp;
}
