package fr.sgfv.maintenance.graphql;

import fr.sgfv.maintenance.dto.MaintenanceCloturerDto;
import fr.sgfv.maintenance.dto.MaintenanceDto;
import fr.sgfv.maintenance.dto.MaintenancePlanifierDto;
import fr.sgfv.maintenance.dto.MaintenanceRequestDto;
import fr.sgfv.maintenance.entity.MaintenanceStatut;
import fr.sgfv.maintenance.service.MaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class MaintenanceGraphQLController {

    private final MaintenanceService maintenanceService;

    // ── Queries ──────────────────────────────────

    @QueryMapping
    public List<MaintenanceDto> maintenances(
            @Argument String statut,
            @Argument String vehiculeId) {
        List<MaintenanceDto> all = maintenanceService.getAllMaintenances();

        return all.stream()
            .filter(m -> statut == null || m.getStatut().name().equals(statut))
            .filter(m -> vehiculeId == null || m.getVehiculeId().toString().equals(vehiculeId))
            .collect(Collectors.toList());
    }

    @QueryMapping
    public MaintenanceDto maintenance(@Argument String id) {
        return maintenanceService.getMaintenanceById(UUID.fromString(id));
    }

    @QueryMapping
    public List<MaintenanceDto> historiqueMaintenance(@Argument String vehiculeId) {
        List<MaintenanceDto> all = maintenanceService.getAllMaintenances();

        return all.stream()
            .filter(m -> m.getVehiculeId().toString().equals(vehiculeId))
            .collect(Collectors.toList());
    }

    // ── Mutations ────────────────────────────────

    @MutationMapping
    public MaintenanceDto signalerMaintenance(@Argument SignalerMaintenanceInput input) {
        MaintenanceRequestDto dto = new MaintenanceRequestDto();
        dto.setVehiculeId(UUID.fromString(input.vehiculeId()));
        dto.setTypeIntervention(input.typeIntervention());
        dto.setDescription(input.description());

        return maintenanceService.signalerMaintenance(dto);
    }

    @MutationMapping
    public MaintenanceDto planifierMaintenance(
            @Argument String id,
            @Argument PlanifierMaintenanceInput input) {
        MaintenancePlanifierDto dto = new MaintenancePlanifierDto();
        dto.setTechnicienId(UUID.fromString(input.technicienId()));
        dto.setDatePlanifiee(input.datePlanifiee());

        return maintenanceService.planifierMaintenance(UUID.fromString(id), dto);
    }

    @MutationMapping
    public MaintenanceDto demarrerMaintenance(@Argument String id) {
        return maintenanceService.demarrerMaintenance(UUID.fromString(id));
    }

    @MutationMapping
    public MaintenanceDto cloturerMaintenance(
            @Argument String id,
            @Argument CloturerMaintenanceInput input) {
        MaintenanceCloturerDto dto = new MaintenanceCloturerDto();
        dto.setCompteRendu(input.compteRendu());
        dto.setCout(input.cout());

        return maintenanceService.cloturerMaintenance(UUID.fromString(id), dto);
    }

    @MutationMapping
    public MaintenanceDto annulerMaintenance(@Argument String id) {
        return maintenanceService.annulerMaintenance(UUID.fromString(id));
    }
}