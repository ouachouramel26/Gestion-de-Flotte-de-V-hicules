-- ==========================================================
-- SGFV — Service Localisation (Version Simplifiée sans PostGIS)
-- ==========================================================

-- 2. Table des Zones de Géo-fencing
CREATE TABLE zones (
    id               UUID             NOT NULL DEFAULT gen_random_uuid(),
    nom              VARCHAR(100)     NOT NULL,
    type             VARCHAR(20)      NOT NULL DEFAULT 'AUTORISEE',
    latitude_centre  DOUBLE PRECISION NOT NULL,
    longitude_centre DOUBLE PRECISION NOT NULL,
    rayon_metres     INTEGER          NULL,
    active           BOOLEAN          NOT NULL DEFAULT TRUE,
    date_creation    TIMESTAMP        NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_zones PRIMARY KEY (id),
    CONSTRAINT chk_zones_type CHECK (type IN ('AUTORISEE', 'INTERDITE'))
);

-- 3. Table des Positions GPS
CREATE TABLE positions (
    id           SERIAL           PRIMARY KEY,
    horodatage   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    vehicule_id  UUID             NOT NULL,
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    vitesse      DOUBLE PRECISION NOT NULL DEFAULT 0,
    direction    DOUBLE PRECISION NULL,
    altitude     DOUBLE PRECISION NULL
);

CREATE INDEX idx_positions_vehicule_temps ON positions (vehicule_id, horodatage DESC);

-- Cache local des véhicules
CREATE TABLE vehicules_cache (
    vehicule_id UUID        NOT NULL,
    plaque      VARCHAR(20) NOT NULL,
    statut      VARCHAR(20) NOT NULL,
    date_sync   TIMESTAMP   NOT NULL DEFAULT NOW(),
    
    CONSTRAINT pk_vehicules_cache PRIMARY KEY (vehicule_id)
);
