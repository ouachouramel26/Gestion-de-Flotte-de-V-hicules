package fr.sgfv.vehicules.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ChangerStatutDTO {

    @NotBlank(message = "Le statut est obligatoire")
    @Pattern(
        regexp = "DISPONIBLE|EN_MISSION|EN_MAINTENANCE|EN_PANNE|HORS_SERVICE",
        message = "Statut invalide"
    )
    private String statut;
}