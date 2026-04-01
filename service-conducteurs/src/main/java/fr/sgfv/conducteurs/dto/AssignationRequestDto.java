package fr.sgfv.conducteurs.dto;

import lombok.Data;

@Data
public class AssignationRequestDto {
    private Long conducteurId;
    private Long vehiculeId;
}
