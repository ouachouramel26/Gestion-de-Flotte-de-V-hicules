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
public class ConducteurEvent {
    private String eventId;
    private String eventType; // EX: CONDUCTEUR_CREATED, CONDUCTEUR_ASSIGNED
    private Long conducteurId;
    private Long vehiculeId;
    private LocalDateTime timestamp;
}
