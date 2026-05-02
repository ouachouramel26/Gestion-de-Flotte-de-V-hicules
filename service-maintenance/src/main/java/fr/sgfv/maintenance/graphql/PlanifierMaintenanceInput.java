package fr.sgfv.maintenance.graphql;

import java.time.LocalDateTime;

public record PlanifierMaintenanceInput(
    String technicienId,
    LocalDateTime datePlanifiee
) {}