const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'sgfv'}:${process.env.DB_PASSWORD || 'sgfv_secret'}@${process.env.DB_HOST || 'postgres-localisation'}:5432/${process.env.DB_NAME || 'localisation_db'}`;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
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
