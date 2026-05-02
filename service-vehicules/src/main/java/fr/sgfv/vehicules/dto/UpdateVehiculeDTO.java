package fr.sgfv.vehicules.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class UpdateVehiculeDTO {

    @Size(max = 50)
    private String marque;

    @Size(max = 50)
    private String modele;

    @Min(1900) @Max(2100)
    private Integer annee;

    @Min(value = 0, message = "Le kilométrage ne peut pas être négatif")
    private Integer kilometrage;
}