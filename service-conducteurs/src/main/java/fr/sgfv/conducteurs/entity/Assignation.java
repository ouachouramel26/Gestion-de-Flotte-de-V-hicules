package fr.sgfv.conducteurs.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "assignations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conducteur_id", nullable = false)
    private Conducteur conducteur;

    @Column(name = "vehicule_id", nullable = false)
    private Long vehiculeId;

    @Column(name = "date_debut", nullable = false)
    private LocalDateTime dateDebut;

    @Column(name = "date_fin")
    private LocalDateTime dateFin;
}
