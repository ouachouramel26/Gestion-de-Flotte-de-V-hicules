package fr.sgfv.conducteurs.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "conducteurs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conducteur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(nullable = false, length = 100)
    private String prenom;

    @Column(name = "numero_permis", nullable = false, unique = true, length = 50)
    private String numeroPermis;

    @Column(name = "type_permis", nullable = false, length = 20)
    private String typePermis;

    @Column(name = "date_expiration_permis", nullable = false)
    private LocalDate dateExpirationPermis;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    @Builder.Default
    private ConducteurStatut statut = ConducteurStatut.ACTIF;
}
