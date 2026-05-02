package fr.sgfv.vehicules.graphql;

public record CreateVehiculeInput(
    String plaque,
    String marque,
    String modele,
    Integer annee,
    Integer kilometrage
) {}