CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Cache local des véhicules EN_MISSION reçus via Kafka (topic vehicules)
-- CORRECTION : pas de FK vers service-vehicules (BDD séparée)
CREATE TABLE vehicules_cache (
    vehicule_id  UUID        NOT NULL,
    plaque       VARCHAR(20) NOT NULL,
    statut       VARCHAR(20) NOT NULL,
    date_sync    TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_vehicules_cache PRIMARY KEY (vehicule_id),
    CONSTRAINT chk_vehicules_cache_statut
        CHECK (statut IN ('DISPONIBLE', 'EN_MISSION', 'EN_MAINTENANCE', 'EN_PANNE', 'HORS_SERVICE'))
);

-- Zones géographiques (géofencing)
-- CORRECTION : modèle simplifié avec latitude_centre/longitude_centre/rayon_metres
-- pour correspondre au Swagger (ZoneDTO) — polygone remplacé par cercle
CREATE TABLE zones (
    id               UUID         NOT NULL DEFAULT gen_random_uuid(),
    nom              VARCHAR(100) NOT NULL,
    type        VARCHAR(20)  NOT NULL DEFAULT 'AUTORISEE',
    latitude_centre  DOUBLE PRECISION NOT NULL,
    longitude_centre DOUBLE PRECISION NOT NULL,
    rayon_metres     INTEGER      NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    date_creation    TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_zones       PRIMARY KEY (id),
    CONSTRAINT chk_zones_type CHECK (type IN ('AUTORISEE', 'INTERDITE')),
    CONSTRAINT chk_zones_lat  CHECK (latitude_centre  BETWEEN -90  AND 90),
    CONSTRAINT chk_zones_lng  CHECK (longitude_centre BETWEEN -180 AND 180),
    CONSTRAINT chk_zones_rayon CHECK (rayon_metres > 0)
);

CREATE INDEX idx_zones_type  ON zones(type);
CREATE INDEX idx_zones_actif ON zones(active);

-- Positions GPS (hypertable TimescaleDB — sans PK pour performance maximale)
-- CORRECTION : FK vehicule_id supprimée — service-vehicules est dans une autre BDD
-- La validité du vehicule_id est vérifiée via vehicules_cache avant insertion
CREATE TABLE positions (
    horodatage   TIMESTAMPTZ      NOT NULL,
    vehicule_id  UUID             NOT NULL,
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    vitesse      DOUBLE PRECISION NOT NULL DEFAULT 0,
    direction    DOUBLE PRECISION NULL,
    zone_id      UUID             NULL,

    -- CORRECTION : pas de FK vers zones (même BDD ici, mais zone peut être supprimée)
    -- zone_id est dénormalisé pour l'historique — on conserve l'info même si la zone est supprimée
    CONSTRAINT chk_positions_latitude
        CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT chk_positions_longitude
        CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_positions_vitesse
        CHECK (vitesse >= 0),
    CONSTRAINT chk_positions_direction
        CHECK (direction IS NULL OR direction BETWEEN 0 AND 360)
);

-- Transformation en hypertable TimescaleDB (partitionnement par temps)
SELECT create_hypertable('positions', 'horodatage');

-- Politique de rétention automatique : supprime les données > 12 mois
SELECT add_retention_policy('positions', INTERVAL '12 months');

-- Index temporels pour les requêtes d'historique
CREATE INDEX idx_positions_vehicule ON positions(vehicule_id, horodatage DESC);
CREATE INDEX idx_positions_zone     ON positions(zone_id,     horodatage DESC);