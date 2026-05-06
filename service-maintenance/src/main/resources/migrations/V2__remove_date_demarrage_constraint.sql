-- Suppression de la contrainte qui empêchait de démarrer une maintenance avant sa date planifiée
ALTER TABLE maintenances DROP CONSTRAINT IF EXISTS chk_maintenances_date_demarrage;
