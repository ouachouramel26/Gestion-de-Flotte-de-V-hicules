CREATE TABLE IF NOT EXISTS conducteurs (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    numero_permis VARCHAR(50) NOT NULL UNIQUE,
    type_permis VARCHAR(20) NOT NULL,
    date_expiration_permis DATE NOT NULL,
    statut VARCHAR(50) NOT NULL DEFAULT 'ACTIF'
);

CREATE TABLE IF NOT EXISTS assignations (
    id SERIAL PRIMARY KEY,
    conducteur_id BIGINT NOT NULL,
    vehicule_id BIGINT NOT NULL,
    date_debut TIMESTAMP NOT NULL,
    date_fin TIMESTAMP,
    CONSTRAINT fk_conducteur FOREIGN KEY (conducteur_id) REFERENCES conducteurs(id) ON DELETE CASCADE
);
