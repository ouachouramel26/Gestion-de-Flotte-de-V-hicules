package fr.sgfv.conducteurs.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConducteurEvent {
    private String eventId;
    private String eventType;
    private UUID conducteurId;
    private String keycloakId;
    private UUID vehiculeId;
    private LocalDateTime timestamp;
}
