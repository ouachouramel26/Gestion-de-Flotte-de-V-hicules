package fr.sgfv.maintenance.dto;

import fr.sgfv.maintenance.entity.TechnicienDisponibilite;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TechnicienDto {
    private UUID id;
    private String keycloakId;
    private String prenom;
    private String nom;
    private String email;
    private String telephone;
    private TechnicienDisponibilite disponibilite;
}
