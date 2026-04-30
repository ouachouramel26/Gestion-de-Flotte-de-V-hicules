package fr.sgfv.conducteurs.graphql;

import fr.sgfv.conducteurs.dto.ConducteurDto;
import fr.sgfv.conducteurs.entity.ConducteurStatut;
import fr.sgfv.conducteurs.entity.Disponibilite;
import fr.sgfv.conducteurs.service.ConducteurService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class ConducteurGraphQLController {

    private final ConducteurService conducteurService;

    // ── Queries ──────────────────────────────────

    @QueryMapping
    public List<ConducteurDto> conducteurs(
            @Argument String statutCompte,
            @Argument String disponibilite) {
        List<ConducteurDto> all = conducteurService.getAllConducteurs();

        return all.stream()
            .filter(c -> statutCompte == null || c.getStatutCompte().name().equals(statutCompte))
            .filter(c -> disponibilite == null || c.getDisponibilite().name().equals(disponibilite))
            .collect(Collectors.toList());
    }

    @QueryMapping
    public ConducteurDto conducteur(@Argument String id) {
        return conducteurService.getConducteurById(UUID.fromString(id));
    }

    // ── Mutations ────────────────────────────────

    @MutationMapping
    public ConducteurDto creerConducteur(@Argument CreerConducteurInput input) {
        ConducteurDto dto = new ConducteurDto();
        dto.setKeycloakId(input.keycloakId());
        dto.setPrenom(input.prenom());
        dto.setNom(input.nom());
        dto.setEmail(input.email());
        dto.setTelephone(input.telephone());
        dto.setNumeroPermis(input.numeroPermis());
        dto.setDateExpirationPermis(input.dateExpirationPermis());

        return conducteurService.createConducteur(dto);
    }

    @MutationMapping
    public ConducteurDto modifierConducteur(
            @Argument String id,
            @Argument ModifierConducteurInput input) {
        ConducteurDto dto = new ConducteurDto();
        dto.setPrenom(input.prenom());
        dto.setNom(input.nom());
        dto.setEmail(input.email());
        dto.setTelephone(input.telephone());
        dto.setNumeroPermis(input.numeroPermis());
        dto.setDateExpirationPermis(input.dateExpirationPermis());

        return conducteurService.updateConducteur(UUID.fromString(id), dto);
    }

    @MutationMapping
    public ConducteurDto changerStatutConducteur(
            @Argument String id,
            @Argument String statutCompte) {
        return conducteurService.changeStatut(UUID.fromString(id), ConducteurStatut.valueOf(statutCompte));
    }

    @MutationMapping
    public ConducteurDto changerDisponibiliteConducteur(
            @Argument String id,
            @Argument String disponibilite) {
        return conducteurService.changeDisponibilite(UUID.fromString(id), Disponibilite.valueOf(disponibilite));
    }

    @MutationMapping
    public ConducteurDto desactiverConducteur(@Argument String id) {
        return conducteurService.deactivateConducteur(UUID.fromString(id));
    }
}