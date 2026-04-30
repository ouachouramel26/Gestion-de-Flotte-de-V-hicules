package fr.sgfv.conducteurs.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "conducteurs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conducteur {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "keycloak_id", nullable = false, length = 36, unique = true)
    private String keycloakId;

    @Column(nullable = false, length = 100)
    private String nom;

    @Column(nullable = false, length = 100)
    private String prenom;

    @Column(nullable = false, length = 100, unique = true)
    private String email;

    @Column(length = 20)
    private String telephone;

    @Column(name = "numero_permis", nullable = false, unique = true, length = 50)
    private String numeroPermis;

    @Column(name = "date_expiration_permis", nullable = false)
    private LocalDate dateExpirationPermis;

    @Column(name = "vehicule_assigne_id")
    private UUID vehiculeAssigneId;

    @Enumerated(EnumType.STRING)
    @Column(name = "statut_compte", nullable = false, length = 20)
    @Builder.Default
    private ConducteurStatut statutCompte = ConducteurStatut.ACTIF;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Disponibilite disponibilite = Disponibilite.DISPONIBLE;

    @CreationTimestamp
    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    @UpdateTimestamp
    @Column(name = "date_modification")
    private LocalDateTime dateModification;
}
