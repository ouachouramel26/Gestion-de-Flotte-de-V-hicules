package fr.sgfv.conducteurs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignationResponseDto {
    private Long id;
    private ConducteurDto conducteur;
    private Long vehiculeId;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
}
