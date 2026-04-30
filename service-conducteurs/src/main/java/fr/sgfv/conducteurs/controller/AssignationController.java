package fr.sgfv.conducteurs.controller;

import fr.sgfv.conducteurs.dto.AssignationRequestDto;
import fr.sgfv.conducteurs.dto.AssignationResponseDto;
import fr.sgfv.conducteurs.service.AssignationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(value = "/api/v1/assignations", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class AssignationController {

    private final AssignationService assignationService;

    // Seul l'admin peut assigner un véhicule à un conducteur
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('admin')")
    public AssignationResponseDto assignerVehicule(@RequestBody AssignationRequestDto request) {
        return assignationService.assignVehicule(request);
    }
}
