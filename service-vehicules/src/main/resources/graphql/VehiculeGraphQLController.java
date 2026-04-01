package fr.sgfv.vehicules.graphql;

import fr.sgfv.vehicules.dto.*;
import fr.sgfv.vehicules.service.VehiculeService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class VehiculeGraphQLController {

    private final VehiculeService vehiculeService;

    // ── Queries ──────────────────────────────────

    @QueryMapping
    public List<VehiculeDTO> vehicules(
            @Argument String statut,
            @Argument String marque) {
        return vehiculeService.listerVehicules(statut, marque);
    }

    @QueryMapping
    public VehiculeDTO vehicule(@Argument String id) {
        return vehiculeService.getVehicule(UUID.fromString(id));
    }

    // ── Mutations ────────────────────────────────

    @MutationMapping
    public VehiculeDTO creerVehicule(@Argument CreateVehiculeInput input) {
        CreateVehiculeDTO dto = new CreateVehiculeDTO();
        dto.setPlaque(input.plaque());
        dto.setMarque(input.marque());
        dto.setModele(input.modele());
        dto.setAnnee(input.annee());
        dto.setKilometrage(input.kilometrage() != null ? input.kilometrage() : 0);
        return vehiculeService.creerVehicule(dto);
    }

    @MutationMapping
    public VehiculeDTO changerStatut(
            @Argument String id,
            @Argument String statut) {
        ChangerStatutDTO dto = new ChangerStatutDTO();
        dto.setStatut(statut);
        return vehiculeService.changerStatut(UUID.fromString(id), dto);
    }

    @MutationMapping
    public VehiculeDTO archiverVehicule(@Argument String id) {
        return vehiculeService.archiverVehicule(UUID.fromString(id));
    }
}