const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://sgfv:sgfv_secret@postgres-localisation:5432/localisation_db'
});

// Auto-migration
const runMigrations = async () => {
  try {
    const migrationPath = path.join(__dirname, '../migrations/V1__creation_localisation.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await pool.query(sql);
    console.log('✅ Migrations Localisation (PostGIS + Tables) terminées avec succès');
  } catch (err) {
    console.error('❌ Erreur lors des migrations Localisation:', err.message);
    // On n'arrête pas le processus car PostGIS peut déjà être là
  }
};

// Test de connexion
pool.on('connect', () => {
  console.log('Connecté à TimescaleDB (service-localisation)');
});

runMigrations();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
