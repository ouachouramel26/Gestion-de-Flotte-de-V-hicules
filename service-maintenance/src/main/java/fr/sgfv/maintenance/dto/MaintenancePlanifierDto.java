package fr.sgfv.maintenance.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class MaintenancePlanifierDto {
    private UUID technicienId;
    private LocalDateTime datePlanifiee;
}
