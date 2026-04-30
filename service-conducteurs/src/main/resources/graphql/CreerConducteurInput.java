package fr.sgfv.conducteurs.graphql;

import java.time.LocalDate;

public record CreerConducteurInput(
    String keycloakId,
    String prenom,
    String nom,
    String email,
    String telephone,
    String numeroPermis,
    LocalDate dateExpirationPermis
) {}