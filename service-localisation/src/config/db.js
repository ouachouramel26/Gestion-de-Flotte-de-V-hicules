const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Test de connexion
pool.on('connect', () => {
  console.log('Connecté à TimescaleDB (service-localisation)');
});

pool.on('error', (err) => {
  console.error('Erreur inattendue sur le client PostgreSQL', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
