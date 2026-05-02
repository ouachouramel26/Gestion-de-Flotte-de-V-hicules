package fr.sgfv.maintenance.controller;

import fr.sgfv.maintenance.dto.MaintenanceCloturerDto;
import fr.sgfv.maintenance.dto.MaintenanceDto;
import fr.sgfv.maintenance.dto.MaintenancePlanifierDto;
import fr.sgfv.maintenance.dto.MaintenanceRequestDto;
import fr.sgfv.maintenance.service.MaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(value = "/api/v1/maintenances", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    @GetMapping
    public List<MaintenanceDto> getAll() {
        return maintenanceService.getAllMaintenances();
    }

    @GetMapping("/{id}")
    public MaintenanceDto getById(@PathVariable("id") UUID id) {
        return maintenanceService.getMaintenanceById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MaintenanceDto signaler(@RequestBody MaintenanceRequestDto request) {
        return maintenanceService.signalerMaintenance(request);
    }

    @PutMapping("/{id}/planifier")
    public MaintenanceDto planifier(@PathVariable("id") UUID id, @RequestBody MaintenancePlanifierDto request) {
        return maintenanceService.planifierMaintenance(id, request);
    }

    @PutMapping("/{id}/demarrer")
    public MaintenanceDto demarrer(@PathVariable("id") UUID id) {
        return maintenanceService.demarrerMaintenance(id);
    }

    @PutMapping("/{id}/cloturer")
    public MaintenanceDto cloturer(@PathVariable("id") UUID id, @RequestBody MaintenanceCloturerDto request) {
        return maintenanceService.cloturerMaintenance(id, request);
    }

    @PutMapping("/{id}/annuler")
    public MaintenanceDto annuler(@PathVariable("id") UUID id) {
        return maintenanceService.annulerMaintenance(id);
    }
}
