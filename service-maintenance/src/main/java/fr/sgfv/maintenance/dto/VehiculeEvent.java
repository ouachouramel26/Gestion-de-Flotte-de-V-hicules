package fr.sgfv.maintenance.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import fr.sgfv.maintenance.entity.VehiculeStatut;
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
public class VehiculeEvent {
    
    @JsonProperty("event")
    private String event;

    @JsonProperty("vehicule_id")
    private UUID vehiculeId;

    @JsonProperty("plaque")
    private String plaque;

    @JsonProperty("statut")
    private VehiculeStatut statut;
    
    @JsonProperty("statut_nouveau")
    private VehiculeStatut statutNouveau;

    @JsonProperty("horodatage")
    private String horodatage;
}
