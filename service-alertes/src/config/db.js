const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Auto-migration
const runMigrations = async () => {
  try {
    console.log('[DB] Vérification des tables...');
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'alertes'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('[DB] Table "alertes" manquante. Lancement des migrations...');
      const migrationPath = path.join(__dirname, '..', 'migrations', 'V1__creation_alertes.sql');
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(sql);
      console.log('[DB] Migrations terminées avec succès !');
    }
  } catch (err) {
    console.error('[DB] Erreur lors des migrations:', err.message);
  }
};

runMigrations();

module.exports = {
  query: (text, params) => pool.query(text, params),
};
