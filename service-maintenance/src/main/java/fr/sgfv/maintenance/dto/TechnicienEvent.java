package fr.sgfv.maintenance.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class TechnicienEvent {
    
    @JsonProperty("event")
    private String event;

    @JsonProperty("technicien_id")
    private UUID technicienId;

    @JsonProperty("keycloak_id")
    private String keycloakId;

    @JsonProperty("nom")
    private String nom;

    @JsonProperty("prenom")
    private String prenom;

    @JsonProperty("disponibilite")
    private TechnicienDisponibilite disponibilite;

    @JsonProperty("horodatage")
    private String horodatage;
}
