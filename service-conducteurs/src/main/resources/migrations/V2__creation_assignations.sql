CREATE TABLE IF NOT EXISTS assignations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    conducteur_id UUID NOT NULL,
    vehicule_id UUID NOT NULL,
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP,
    date_creation TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_assignations PRIMARY KEY (id),

    CONSTRAINT fk_assignations_conducteur
    FOREIGN KEY (conducteur_id)
    REFERENCES conducteurs(id)
    ON DELETE CASCADE,

    CONSTRAINT chk_assignations_dates
    CHECK (date_fin IS NULL OR date_fin > date_debut)
);

CREATE INDEX idx_assignations_conducteur ON assignations(conducteur_id);
CREATE INDEX idx_assignations_vehicule   ON assignations(vehicule_id);
CREATE INDEX idx_assignations_en_cours   ON assignations(conducteur_id) WHERE date_fin IS NULL;