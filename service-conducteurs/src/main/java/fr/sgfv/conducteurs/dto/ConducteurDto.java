package fr.sgfv.conducteurs.dto;

import fr.sgfv.conducteurs.entity.ConducteurStatut;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConducteurDto {
    private Long id;
    private String nom;
    private String prenom;
    private String numeroPermis;
    private String typePermis;
    private LocalDate dateExpirationPermis;
    private ConducteurStatut statut;
}
