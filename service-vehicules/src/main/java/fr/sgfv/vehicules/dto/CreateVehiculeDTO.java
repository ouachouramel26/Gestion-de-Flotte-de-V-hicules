package fr.sgfv.vehicules.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CreateVehiculeDTO {

    @NotBlank(message = "La plaque est obligatoire")
    @Size(max = 20, message = "La plaque ne peut pas dépasser 20 caractères")
    private String plaque;

    @NotBlank(message = "La marque est obligatoire")
    @Size(max = 50)
    private String marque;

    @NotBlank(message = "Le modèle est obligatoire")
    @Size(max = 50)
    private String modele;

    @NotNull(message = "L'année est obligatoire")
    @Min(value = 1900, message = "L'année doit être >= 1900")
    @Max(value = 2100, message = "L'année doit être <= 2100")
    private Integer annee;

    @Min(value = 0, message = "Le kilométrage ne peut pas être négatif")
    private Integer kilometrage = 0;
}