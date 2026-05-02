-- Migration pour corriger les colonnes manquantes et les tables de cache
-- AJOUT de la colonne plaque dans la table alertes
ALTER TABLE alertes ADD COLUMN IF NOT EXISTS plaque VARCHAR(20) NULL;

-- Création des tables de cache si elles n'existent pas
CREATE TABLE IF NOT EXISTS vehicules_cache (
    id      UUID        NOT NULL,
    plaque  VARCHAR(20) NOT NULL,
    CONSTRAINT pk_vehicules_cache PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS conducteurs_cache (
    id           UUID        NOT NULL,
    keycloak_id  VARCHAR(36) NOT NULL,
    CONSTRAINT pk_conducteurs_cache PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS vehicule_assignments_cache (
    vehicule_id    UUID        NOT NULL,
    conducteur_id  VARCHAR(36) NOT NULL,
    date_assignation TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT pk_vehicule_assignments_cache PRIMARY KEY (vehicule_id)
);
