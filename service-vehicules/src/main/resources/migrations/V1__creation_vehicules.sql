CREATE TABLE vehicules (
    id                    UUID        NOT NULL DEFAULT gen_random_uuid(),
    plaque                VARCHAR(20) NOT NULL,
    marque                VARCHAR(50) NOT NULL,
    modele                VARCHAR(50) NOT NULL,
    annee                 INTEGER     NOT NULL,
    kilometrage           INTEGER     NOT NULL DEFAULT 0,
    statut                VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE',
    conducteur_assigne_id UUID        NULL,
    date_ajout            TIMESTAMP   NOT NULL DEFAULT NOW(),
    date_modification     TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_vehicules
        PRIMARY KEY (id),
    CONSTRAINT uq_vehicules_plaque
        UNIQUE (plaque),
    CONSTRAINT chk_vehicules_statut
        CHECK (statut IN ('DISPONIBLE', 'EN_MISSION', 'EN_MAINTENANCE', 'EN_PANNE', 'HORS_SERVICE')),
    CONSTRAINT chk_vehicules_annee
        CHECK (annee >= 1900 AND annee <= 2100),
    CONSTRAINT chk_vehicules_kilometrage
        CHECK (kilometrage >= 0)
);

CREATE INDEX idx_vehicules_statut ON vehicules(statut);
CREATE INDEX idx_vehicules_plaque ON vehicules(plaque);

-- Trigger : empêche la diminution du kilométrage
-- CORRECTION : la fonction existait mais CREATE TRIGGER était absent
CREATE FUNCTION check_km_update()
RETURNS trigger AS $$
BEGIN
    IF NEW.kilometrage < OLD.kilometrage THEN
        RAISE EXCEPTION 'Le kilométrage ne peut pas diminuer (actuel: %, reçu: %)',
            OLD.kilometrage, NEW.kilometrage;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vehicules_km_update
    BEFORE UPDATE ON vehicules
    FOR EACH ROW
    EXECUTE FUNCTION check_km_update();

-- Trigger : met à jour date_modification automatiquement à chaque UPDATE
CREATE FUNCTION set_date_modification()
RETURNS trigger AS $$
BEGIN
    NEW.date_modification = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vehicules_date_modification
    BEFORE UPDATE ON vehicules
    FOR EACH ROW
    EXECUTE FUNCTION set_date_modification();