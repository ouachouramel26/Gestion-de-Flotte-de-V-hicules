package fr.sgfv.conducteurs.graphql;

import java.time.LocalDate;

public record ModifierConducteurInput(
    String prenom,
    String nom,
    String email,
    String telephone,
    String numeroPermis,
    LocalDate dateExpirationPermis
) {}