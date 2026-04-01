package fr.sgfv.vehicules.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class AssignerVehiculeDTO {

    @NotNull(message = "Le conducteur_id est obligatoire")
    private UUID conducteurId;
}