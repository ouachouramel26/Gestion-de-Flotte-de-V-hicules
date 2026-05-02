package fr.sgfv.maintenance.graphql;

import java.math.BigDecimal;

public record CloturerMaintenanceInput(
    String compteRendu,
    BigDecimal cout
) {}