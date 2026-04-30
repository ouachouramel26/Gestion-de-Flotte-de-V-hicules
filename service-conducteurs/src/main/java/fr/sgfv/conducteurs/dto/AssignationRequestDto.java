package fr.sgfv.conducteurs.dto;

import lombok.Data;
import java.util.UUID;

@Data
public class AssignationRequestDto {
    private UUID conducteurId;
    private UUID vehiculeId;
}
