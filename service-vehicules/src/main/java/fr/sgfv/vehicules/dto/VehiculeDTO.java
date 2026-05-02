package fr.sgfv.vehicules.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class VehiculeDTO {
    private UUID id;
    private String plaque;
    private String marque;
    private String modele;
    private Integer annee;
    private Integer kilometrage;
    private String statut;
    private UUID conducteurAssigneId;
    private LocalDateTime dateAjout;
    private LocalDateTime dateModification;
}