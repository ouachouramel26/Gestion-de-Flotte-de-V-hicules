package fr.sgfv.maintenance.graphql;

public record SignalerMaintenanceInput(
    String vehiculeId,
    String typeIntervention,
    String description
) {}