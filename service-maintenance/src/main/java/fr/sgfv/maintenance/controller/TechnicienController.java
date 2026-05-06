package fr.sgfv.maintenance.controller;

import fr.sgfv.maintenance.dto.TechnicienDto;
import fr.sgfv.maintenance.service.TechnicienService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/techniciens")
@RequiredArgsConstructor
public class TechnicienController {

    private final TechnicienService technicienService;

    @GetMapping
    public List<TechnicienDto> getAll() {
        return technicienService.getAll();
    }

    @GetMapping("/{id}")
    public TechnicienDto getById(@PathVariable UUID id) {
        return technicienService.getById(id);
    }

    @GetMapping("/me")
    public TechnicienDto getMyProfile(@org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt) {
        String keycloakId = jwt.getSubject();
        return technicienService.getByKeycloakId(keycloakId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TechnicienDto create(@RequestBody TechnicienDto dto) {
        return technicienService.create(dto);
    }

    @PutMapping("/{id}")
    public TechnicienDto update(@PathVariable UUID id, @RequestBody TechnicienDto dto) {
        return technicienService.update(id, dto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        technicienService.delete(id);
    }
}
