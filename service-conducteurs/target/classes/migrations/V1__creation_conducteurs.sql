-- Fonction partagée : met à jour date_modification automatiquement
CREATE OR REPLACE FUNCTION set_date_modification()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS conducteurs (
    id                     UUID         NOT NULL DEFAULT gen_random_uuid(),
    -- CORRECTION : keycloak_id ajouté — lien avec le compte Keycloak du conducteur
    keycloak_id            VARCHAR(36)  NOT NULL,
    prenom                 VARCHAR(50)  NOT NULL,
    nom                    VARCHAR(50)  NOT NULL,
    email                  VARCHAR(100) NOT NULL,
    telephone              VARCHAR(20),
    numero_permis          VARCHAR(50)  NOT NULL,
    date_expiration_permis DATE         NOT NULL,
    -- CORRECTION : simple UUID sans FK — vehicules est dans une BDD séparée (microservices)
    -- La cohérence est garantie par les événements Kafka, pas par une FK inter-BDD
    vehicule_assigne_id    UUID         NULL,
    statut_compte          VARCHAR(20)  NOT NULL DEFAULT 'ACTIF',
    disponibilite          VARCHAR(20)  NOT NULL DEFAULT 'DISPONIBLE',
    date_creation          TIMESTAMP    NOT NULL DEFAULT NOW(),
    date_modification      TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_conducteurs
        PRIMARY KEY (id),
    CONSTRAINT uq_conducteurs_keycloak_id
        UNIQUE (keycloak_id),
    CONSTRAINT uq_conducteurs_email
        UNIQUE (email),
    CONSTRAINT uq_conducteurs_numero_permis
        UNIQUE (numero_permis),
    CONSTRAINT chk_conducteurs_statut
        CHECK (statut_compte IN ('ACTIF', 'INACTIF', 'SUSPENDU')),
    CONSTRAINT chk_conducteurs_dispo
        CHECK (disponibilite IN ('DISPONIBLE', 'EN_MISSION')),
    -- Règle métier : si le conducteur est INACTIF ou SUSPENDU, pas de véhicule assigné
    CONSTRAINT chk_conducteurs_dispo_statut
        CHECK (statut_compte = 'ACTIF' OR vehicule_assigne_id IS NULL)
);

CREATE INDEX idx_conducteurs_statut   ON conducteurs(statut_compte);
CREATE INDEX idx_conducteurs_dispo    ON conducteurs(disponibilite);
CREATE INDEX idx_conducteurs_email    ON conducteurs(email);
CREATE INDEX idx_conducteurs_keycloak ON conducteurs(keycloak_id);


-- Trigger : met à jour date_modification automatiquement
CREATE TRIGGER trg_conducteurs_date_modification
    BEFORE UPDATE ON conducteurs
    FOR EACH ROW
    EXECUTE FUNCTION set_date_modification();
