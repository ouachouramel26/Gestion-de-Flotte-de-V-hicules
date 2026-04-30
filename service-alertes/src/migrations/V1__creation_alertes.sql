-- Cache local des utilisateurs reçus via Kafka (topic utilisateurs)
-- Utilisé par service-alertes pour filtrer les alertes par rôle
CREATE TABLE utilisateurs_cache (
    keycloak_id  VARCHAR(36)  NOT NULL,
    prenom       VARCHAR(50)  NOT NULL,
    nom          VARCHAR(50)  NOT NULL,
    email        VARCHAR(100) NOT NULL,
    role         VARCHAR(20)  NOT NULL,
    date_sync    TIMESTAMP    NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_utilisateurs_cache PRIMARY KEY (keycloak_id),
    CONSTRAINT chk_utilisateurs_role CHECK (role IN ('CONDUCTEUR', 'TECHNICIEN', 'ADMIN'))
);

CREATE INDEX idx_utilisateurs_cache_role ON utilisateurs_cache(role);

-- Table principale des alertes
CREATE TABLE alertes (
    id                UUID        NOT NULL DEFAULT gen_random_uuid(),
    type_evenement    VARCHAR(30) NOT NULL,
    niveau            VARCHAR(20) NOT NULL,
    role_destinataire VARCHAR(20) NOT NULL,
    vehicule_id       UUID        NULL,
    utilisateur_id    VARCHAR(36) NULL,
    message           TEXT        NOT NULL,
    est_lu            BOOLEAN     NOT NULL DEFAULT FALSE,
    date_lecture      TIMESTAMP   NULL,
    date_creation     TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT pk_alertes PRIMARY KEY (id),
    CONSTRAINT chk_alertes_type CHECK (type_evenement IN (
        'VEHICULE_ASSIGNE',
        'REVISION_PLANIFIEE',
        'PERMIS_EXPIRE',
        'SEUIL_KM_ATTEINT',
        'MAINTENANCE_TERMINEE',
        'PANNE_SIGNALEE',
        'SORTIE_ZONE',
        'VITESSE_EXCESSIVE'
    )),
    CONSTRAINT chk_alertes_niveau CHECK (niveau IN (
        'INFO', 'AVERTISSEMENT', 'CRITIQUE', 'URGENCE'
    )),
    CONSTRAINT chk_alertes_role CHECK (role_destinataire IN (
        'CONDUCTEUR', 'TECHNICIEN', 'ADMIN'
    )),
    -- Règle métier : date_lecture renseignée seulement si est_lu = TRUE
    CONSTRAINT chk_alertes_date_lecture
        CHECK (est_lu = TRUE OR date_lecture IS NULL)
);

CREATE INDEX idx_alertes_role_destinataire ON alertes(role_destinataire);
CREATE INDEX idx_alertes_niveau            ON alertes(niveau);
CREATE INDEX idx_alertes_est_lu            ON alertes(est_lu);
CREATE INDEX idx_alertes_utilisateur_id    ON alertes(utilisateur_id);
CREATE INDEX idx_alertes_vehicule_id       ON alertes(vehicule_id);
-- Index pour les requêtes triées par date (les plus récentes en premier)
CREATE INDEX idx_alertes_date_creation     ON alertes(date_creation DESC);