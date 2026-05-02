package fr.sgfv.conducteurs.controller;

import fr.sgfv.conducteurs.dto.ConducteurDto;
import fr.sgfv.conducteurs.service.ConducteurService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/v1/conducteurs", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class ConducteurController {

    private final ConducteurService conducteurService;

    // Tous les rôles peuvent lister les conducteurs
    @GetMapping
    @PreAuthorize("hasAnyRole('admin', 'technicien', 'conducteur')")
    public List<ConducteurDto> getAll() {
        return conducteurService.getAllConducteurs();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('admin', 'technicien', 'conducteur')")
    public ConducteurDto getById(@PathVariable UUID id) {
        return conducteurService.getConducteurById(id);
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('admin', 'technicien', 'conducteur')")
    public ConducteurDto getMyProfile(@org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt) {
        String keycloakId = jwt.getSubject();
        return conducteurService.getConducteurByKeycloakId(keycloakId);
    }

    // Seul l'admin peut créer un conducteur
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('admin')")
    public ConducteurDto create(@RequestBody ConducteurDto dto) {
        return conducteurService.createConducteur(dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    public ConducteurDto update(@PathVariable UUID id, @RequestBody ConducteurDto dto) {
        return conducteurService.updateConducteur(id, dto);
    }

    @PatchMapping("/{id}/statut")
    @PreAuthorize("hasRole('admin')")
    public ConducteurDto changeStatut(@PathVariable UUID id, @RequestBody java.util.Map<String, String> body) {
        return conducteurService.changeStatut(id, fr.sgfv.conducteurs.entity.ConducteurStatut.valueOf(body.get("nouveauStatut")));
    }

    @PatchMapping("/{id}/disponibilite")
    @PreAuthorize("hasAnyRole('admin', 'technicien')")
    public ConducteurDto changeDisponibilite(@PathVariable UUID id, @RequestBody java.util.Map<String, String> body) {
        return conducteurService.changeDisponibilite(id, fr.sgfv.conducteurs.entity.Disponibilite.valueOf(body.get("disponibilite")));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('admin')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        conducteurService.deactivateConducteur(id);
    }
}
