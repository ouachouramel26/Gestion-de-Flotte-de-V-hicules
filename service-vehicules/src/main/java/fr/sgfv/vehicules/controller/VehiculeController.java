package fr.sgfv.vehicules.controller;

import fr.sgfv.vehicules.dto.*;
import fr.sgfv.vehicules.service.VehiculeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/vehicules")
@RequiredArgsConstructor
public class VehiculeController {

    private final VehiculeService vehiculeService;

    @GetMapping
    public ResponseEntity<List<VehiculeDTO>> lister(
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String marque) {
        return ResponseEntity.ok(vehiculeService.listerVehicules(statut, marque));
    }

    @GetMapping("/{id}")
    public ResponseEntity<VehiculeDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(vehiculeService.getVehicule(id));
    }

    @PostMapping
    public ResponseEntity<VehiculeDTO> creer(
            @Valid @RequestBody CreateVehiculeDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(vehiculeService.creerVehicule(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<VehiculeDTO> modifier(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVehiculeDTO dto) {
        return ResponseEntity.ok(vehiculeService.modifierVehicule(id, dto));
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<VehiculeDTO> changerStatut(
            @PathVariable UUID id,
            @Valid @RequestBody ChangerStatutDTO dto) {
        return ResponseEntity.ok(vehiculeService.changerStatut(id, dto));
    }

    @PatchMapping("/{id}/assigner")
    public ResponseEntity<VehiculeDTO> assigner(
            @PathVariable UUID id,
            @Valid @RequestBody AssignerVehiculeDTO dto) {
        return ResponseEntity.ok(vehiculeService.assignerConducteur(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<VehiculeDTO> archiver(@PathVariable UUID id) {
        return ResponseEntity.ok(vehiculeService.archiverVehicule(id));
    }
}