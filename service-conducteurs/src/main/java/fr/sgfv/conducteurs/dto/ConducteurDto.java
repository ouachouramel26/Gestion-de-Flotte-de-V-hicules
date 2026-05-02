package fr.sgfv.conducteurs.dto;

import fr.sgfv.conducteurs.entity.ConducteurStatut;
import fr.sgfv.conducteurs.entity.Disponibilite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConducteurDto {
    private String id;
    private String keycloakId;
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    private String numeroPermis;
    private String dateExpirationPermis;
    private String vehiculeAssigneId;
    private String statutCompte;
    private String disponibilite;
    private String dateCreation;
}
