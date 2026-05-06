-- Migration pour ajouter les types d'événements manquants dans la contrainte de la table alertes
ALTER TABLE alertes DROP CONSTRAINT IF EXISTS chk_alertes_type;

ALTER TABLE alertes ADD CONSTRAINT chk_alertes_type CHECK (type_evenement IN (
    'VEHICULE_ASSIGNE',
    'REVISION_PLANIFIEE',
    'PERMIS_EXPIRE',
    'SEUIL_KM_ATTEINT',
    'MAINTENANCE_TERMINEE',
    'MAINTENANCE_DEBUTEE',    -- AJOUTÉ
    'MAINTENANCE_ANNULEE',    -- AJOUTÉ
    'PANNE_SIGNALEE',
    'SORTIE_ZONE',
    'VITESSE_EXCESSIVE'
));
