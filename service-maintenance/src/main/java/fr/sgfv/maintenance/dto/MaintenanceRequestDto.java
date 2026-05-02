package fr.sgfv.maintenance.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class MaintenanceRequestDto {
    private UUID vehiculeId;
    private String typeIntervention;
    private String description;
}
