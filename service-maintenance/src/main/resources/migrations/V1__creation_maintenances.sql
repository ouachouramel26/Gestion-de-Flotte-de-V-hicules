-- Fonction partagée : met à jour date_modification automatiquement
CREATE OR REPLACE FUNCTION set_date_modification()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_modification = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cache local des véhicules reçus via Kafka (topic vehicules)
-- CORRECTION : pas de FK vers une autre BDD — cohérence assurée par Kafka
CREATE TABLE IF NOT EXISTS vehicules_cache (
    vehicule_id   UUID        NOT NULL,
    plaque        VARCHAR(20) NOT NULL,
    statut        VARCHAR(20) NOT NULL,
    date_sync     TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_vehicules_cache PRIMARY KEY (vehicule_id),
    CONSTRAINT chk_vehicules_cache_statut
        CHECK (statut IN ('DISPONIBLE', 'EN_MISSION', 'EN_MAINTENANCE', 'EN_PANNE', 'HORS_SERVICE'))
);

-- Cache local des techniciens reçus via Kafka (topic utilisateurs)
CREATE TABLE techniciens (
    id            UUID        NOT NULL DEFAULT gen_random_uuid(),
    keycloak_id   VARCHAR(36) NOT NULL,
    prenom        VARCHAR(50) NOT NULL,
    nom           VARCHAR(50) NOT NULL,
    disponibilite VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE',

    CONSTRAINT pk_techniciens PRIMARY KEY (id),
    CONSTRAINT uq_techniciens_keycloak_id UNIQUE (keycloak_id),
    CONSTRAINT chk_techniciens_disponibilite
        CHECK (disponibilite IN ('DISPONIBLE', 'OCCUPE'))
);

CREATE INDEX idx_techniciens_disponibilite ON techniciens(disponibilite);
CREATE INDEX idx_techniciens_keycloak      ON techniciens(keycloak_id);

CREATE TABLE maintenances (
    id                UUID          NOT NULL DEFAULT gen_random_uuid(),
    -- CORRECTION : UUID simple sans FK inter-BDD — référence via vehicules_cache
    vehicule_id       UUID          NOT NULL,
    technicien_id     UUID          NULL,
    -- CORRECTION : type_intervention est un texte libre (pas une enum restrictive)
    -- Le Swagger définit VARCHAR sans contrainte de valeurs fixes
    type_intervention VARCHAR(100)  NOT NULL,
    description       TEXT          NULL,
    statut            VARCHAR(20)   NOT NULL DEFAULT 'SIGNALEE',
    -- CORRECTION : date_planifiee est NULL à la création (statut SIGNALEE)
    -- Elle est renseignée uniquement au passage à PLANIFIEE
    date_planifiee    TIMESTAMP     NULL,
    date_demarrage    TIMESTAMP     NULL,
    date_cloture      TIMESTAMP     NULL,
    cout              DECIMAL(10,2) NULL,
    compte_rendu      TEXT          NULL,
    date_creation     TIMESTAMP     NOT NULL DEFAULT NOW(),
    date_modification TIMESTAMP     NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_maintenances
        PRIMARY KEY (id),
    CONSTRAINT fk_maintenances_technicien
        FOREIGN KEY (technicien_id)
        REFERENCES techniciens(id)
        ON DELETE SET NULL,
    CONSTRAINT chk_maintenances_statut
        CHECK (statut IN ('SIGNALEE', 'PLANIFIEE', 'EN_COURS', 'TERMINEE', 'ANNULEE')),
    CONSTRAINT chk_maintenances_cout
        CHECK (cout IS NULL OR cout >= 0),
    -- Règle métier : technicien obligatoire dès EN_COURS
    CONSTRAINT chk_maintenances_technicien_en_cours
        CHECK (statut != 'EN_COURS' OR technicien_id IS NOT NULL),
    -- Règle métier : date_planifiee >= date_creation si renseignée
    CONSTRAINT chk_maintenances_date_planifiee
        CHECK (date_planifiee IS NULL OR date_planifiee >= date_creation),
    -- Règle métier : date_demarrage >= date_planifiee si renseignée
    CONSTRAINT chk_maintenances_date_demarrage
        CHECK (date_demarrage IS NULL OR date_planifiee IS NULL OR date_demarrage >= date_planifiee),
    -- Règle métier : date_cloture >= date_demarrage si renseignée
    CONSTRAINT chk_maintenances_date_cloture
        CHECK (date_cloture IS NULL OR date_demarrage IS NULL OR date_cloture >= date_demarrage)
);

CREATE INDEX idx_maintenances_vehicule       ON maintenances(vehicule_id);
CREATE INDEX idx_maintenances_technicien     ON maintenances(technicien_id);
CREATE INDEX idx_maintenances_statut         ON maintenances(statut);
CREATE INDEX idx_maintenances_date_planifiee ON maintenances(date_planifiee);


-- Trigger : met à jour date_modification automatiquement
CREATE TRIGGER trg_maintenances_date_modification
    BEFORE UPDATE ON maintenances
    FOR EACH ROW
    EXECUTE FUNCTION set_date_modification();