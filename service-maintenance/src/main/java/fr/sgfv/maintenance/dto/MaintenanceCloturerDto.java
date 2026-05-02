package fr.sgfv.maintenance.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class MaintenanceCloturerDto {
    private BigDecimal cout;
    private String compteRendu;
}
