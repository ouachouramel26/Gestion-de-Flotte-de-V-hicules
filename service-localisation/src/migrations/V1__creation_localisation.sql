-- ==========================================================
-- SGFV — Service Localisation
-- Initialisation TimescaleDB + PostGIS
-- ==========================================================

-- 1. Extensions nécessaires
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Table des Zones de Géo-fencing
-- On utilise le type GEOMETRY de PostGIS pour des calculs spatiaux ultra-rapides
CREATE TABLE zones (
    id               UUID             NOT NULL DEFAULT gen_random_uuid(),
    nom              VARCHAR(100)     NOT NULL,
    type             VARCHAR(20)      NOT NULL DEFAULT 'AUTORISEE',
    geometrie        GEOMETRY(POLYGON, 4326) NOT NULL, -- Polygone spatial (WGS 84)
    latitude_centre  DOUBLE PRECISION NOT NULL,
    longitude_centre DOUBLE PRECISION NOT NULL,
    rayon_metres     INTEGER          NULL, -- Utilisé si c'est une zone circulaire simple
    active           BOOLEAN          NOT NULL DEFAULT TRUE,
    date_creation    TIMESTAMP        NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_zones PRIMARY KEY (id),
    CONSTRAINT chk_zones_type CHECK (type IN ('AUTORISEE', 'INTERDITE'))
);

CREATE INDEX idx_zones_geometrie ON zones USING GIST (geometrie);

-- 3. Table des Positions GPS (Hypertable TimescaleDB)
CREATE TABLE positions (
    horodatage   TIMESTAMPTZ      NOT NULL,
    vehicule_id  UUID             NOT NULL,
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    vitesse      DOUBLE PRECISION NOT NULL DEFAULT 0,
    direction    DOUBLE PRECISION NULL,
    point_geo    GEOMETRY(POINT, 4326) NOT NULL, -- Point spatial indexé
    altitude     DOUBLE PRECISION NULL,

    CONSTRAINT chk_positions_vitesse CHECK (vitesse >= 0)
) ;

-- Transformation en hypertable (partitionnement temporel automatique)
SELECT create_hypertable('positions', 'horodatage');

-- Index spatiaux et temporels
CREATE INDEX idx_positions_spatial ON positions USING GIST (point_geo);
CREATE INDEX idx_positions_vehicule_temps ON positions (vehicule_id, horodatage DESC);

-- Cache local des véhicules pour éviter les jointures cross-DB
CREATE TABLE vehicules_cache (
    vehicule_id UUID        NOT NULL,
    plaque      VARCHAR(20) NOT NULL,
    statut      VARCHAR(20) NOT NULL,
    date_sync   TIMESTAMP   NOT NULL DEFAULT NOW(),
    
    CONSTRAINT pk_vehicules_cache PRIMARY KEY (vehicule_id)
);
