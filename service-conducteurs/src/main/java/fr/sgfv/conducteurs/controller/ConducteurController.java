package fr.sgfv.conducteurs.controller;

import fr.sgfv.conducteurs.dto.ConducteurDto;
import fr.sgfv.conducteurs.service.ConducteurService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(value = "/api/v1/conducteurs", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class ConducteurController {

    private final ConducteurService conducteurService;

    @GetMapping
    public List<ConducteurDto> getAll() {
        return conducteurService.getAllConducteurs();
    }

    @GetMapping("/{id}")
    public ConducteurDto getById(@PathVariable Long id) {
        return conducteurService.getConducteurById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConducteurDto create(@RequestBody ConducteurDto dto) {
        return conducteurService.createConducteur(dto);
    }
}
