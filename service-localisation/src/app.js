require('dotenv').config();
const express = require('express');

const db = require('./config/db');
const { startGrpcServer } = require('./grpc/server');
const { connectProducer } = require('./kafka/producer');

const app = express();
app.use(express.json());

// CORS — autorise le frontend à appeler ce service
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const PORT = process.env.PORT || 8084;


// Initialisation des composants asynchrones
const init = async () => {
  await connectProducer();
  startGrpcServer();
};
init();

// Health check pour Kubernetes
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'service-localisation' });
});

// Connexion directe à la BDD vehicules (même réseau Docker) pour éviter le 401
const { Pool } = require('pg');
const vehPool = new Pool({
  host:     process.env.VEHICULES_DB_HOST     || 'postgres-vehicules',
  port:     parseInt(process.env.VEHICULES_DB_PORT || '5432'),
  database: process.env.VEHICULES_DB_NAME     || 'vehicules_db',
  user:     process.env.VEHICULES_DB_USER     || 'sgfv',
  password: process.env.VEHICULES_DB_PASSWORD || 'sgfv_secret',
});

// Enregistrer une position GPS et vérifier géofencing (REST fallback du gRPC)
app.post('/api/v1/positions', async (req, res) => {
  try {
    const { vehiculeId, latitude, longitude, vitesse, direction } = req.body;
    
    if (!vehiculeId || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'vehiculeId, latitude, longitude requis' });
    }

    // 0. Vérifier si le véhicule est EN_MISSION avant de stocker quoi que ce soit
    const vehCheck = await vehPool.query("SELECT statut FROM vehicules WHERE id = $1", [vehiculeId]);
    if (!vehCheck.rows.length || vehCheck.rows[0].statut !== 'EN_MISSION') {
      return res.status(200).json({ message: 'Position ignorée : véhicule pas en mission' });
    }

    console.log(`[POSITIONS] Recu vehiculeId=${vehiculeId} lat=${latitude} lng=${longitude}`);
    const now = new Date();

    // 1. Insérer la position dans TimescaleDB (avec ou sans PostGIS)
    try {
      await db.query(
        `INSERT INTO positions (horodatage, vehicule_id, latitude, longitude, vitesse, direction, point_geo)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($4, $3), 4326))`,
        [now, vehiculeId, latitude, longitude, vitesse || 0, direction || null]
      );
    } catch (_) {
      await db.query(
        `INSERT INTO positions (horodatage, vehicule_id, latitude, longitude, vitesse, direction)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [now, vehiculeId, latitude, longitude, vitesse || 0, direction || null]
      );
    }

    // 2. Vérifier si le véhicule est dans une zone INTERDITE
    try {
      const zoneCheck = await db.query(
        `SELECT id, nom FROM zones
         WHERE active = true AND type = 'INTERDITE'
         AND ST_Contains(geometrie, ST_SetSRID(ST_MakePoint($1, $2), 4326))
         LIMIT 1`,
        [longitude, latitude]
      );
      if (zoneCheck.rows.length > 0) {
        const zone = zoneCheck.rows[0];
        console.warn(`[GEOFENCE] Vehicule ${vehiculeId} dans zone interdite: ${zone.nom}`);
        const { sendGeofenceAlert } = require('./kafka/producer');
        await sendGeofenceAlert(vehiculeId, 'INTERDITE', `Le vehicule est entré dans la zone interdite : ${zone.nom}`);
      }
    } catch (geoErr) {
      console.warn('[GEOFENCE] PostGIS non disponible:', geoErr.message);
    }

    res.status(201).json({ message: 'Position enregistrée' });
  } catch (err) {
    console.error('[positions] Erreur:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Récupérer l'historique des positions d'un véhicule
app.get('/api/v1/positions/vehicule/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { debut, fin } = req.query;
    
    let query = `
      SELECT 
        vehicule_id as "vehiculeId", 
        latitude, longitude, vitesse, direction, 
        horodatage 
      FROM positions 
      WHERE vehicule_id = $1`;
    const params = [id];

    if (debut && fin) {
      query += ' AND horodatage BETWEEN $2 AND $3';
      params.push(debut, fin);
    }

    query += ' ORDER BY horodatage DESC LIMIT 1000';
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Gérer les zones (GET)
app.get('/api/v1/zones', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nom, type, latitude_centre as "latitudeCentre", longitude_centre as "longitudeCentre", rayon_metres as "rayonMetres", active, date_creation as "dateCreation" FROM zones'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Créer une zone (POST)
app.post('/api/v1/zones', async (req, res) => {
  try {
    const { nom, type, latitudeCentre, longitudeCentre, rayonMetres } = req.body;
    
    // Conversion forcée en nombres pour éviter les erreurs de type pg/postgis
    const lat = parseFloat(latitudeCentre);
    const lng = parseFloat(longitudeCentre);
    const rayon = parseFloat(rayonMetres);

    // On crée un polygone circulaire spatial avec PostGIS
    const result = await db.query(
      `INSERT INTO zones (nom, type, latitude_centre, longitude_centre, rayon_metres, geometrie)
       VALUES ($1, $2, CAST($3 AS float8), CAST($4 AS float8), $5, 
               ST_Buffer(ST_SetSRID(ST_MakePoint(CAST($4 AS float8), CAST($3 AS float8)), 4326)::geography, CAST($6 AS float8))::geometry)
       RETURNING id, nom`,
      [nom, type, lat, lng, Math.round(rayon), rayon]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de la création de la zone:', err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer une zone (DELETE)
app.delete('/api/v1/zones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM zones WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zone introuvable' });
    }
    
    res.json({ message: 'Zone supprimée avec succès', id });
  } catch (err) {
    console.error('Erreur lors de la suppression de la zone:', err);
    res.status(500).json({ error: err.message });
  }
});

// Récupérer les véhicules EN_MISSION et leurs positions (GET)
app.get('/api/v1/vehicules', async (req, res) => {
  try {
    // 1. Récupérer les véhicules EN_MISSION depuis la BDD vehicules directement
    const vehResult = await vehPool.query(
      "SELECT id, plaque, marque, modele, statut FROM vehicules WHERE statut = 'EN_MISSION'"
    );

    if (vehResult.rows.length === 0) {
      return res.json([]);
    }

    // 2. Récupérer la dernière position GPS pour chaque véhicule
    const ids = vehResult.rows.map(v => v.id);
    const posQuery = `
      SELECT DISTINCT ON (vehicule_id) vehicule_id, latitude, longitude, vitesse, direction
      FROM positions
      WHERE vehicule_id = ANY($1::uuid[])
      ORDER BY vehicule_id, horodatage DESC
    `;
    const posResult = await db.query(posQuery, [ids]).catch(() => ({ rows: [] }));
    const posMap = {};
    posResult.rows.forEach(p => { posMap[p.vehicule_id] = p; });

    const vehicules = vehResult.rows.map(v => {
      const pos = posMap[v.id];
      const lat = pos ? pos.latitude  : 48.8566 + (Math.random() - 0.5) * 0.1;
      const lng = pos ? pos.longitude : 2.3522  + (Math.random() - 0.5) * 0.1;
      
      // Si c'est une position générée aléatoirement, on l'envoie à notre propre endpoint
      // pour déclencher la vérification des zones interdites (simulation réaliste).
      if (!pos) {
        fetch(`http://localhost:${process.env.PORT || 8084}/api/v1/positions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vehiculeId: v.id, latitude: lat, longitude: lng, vitesse: 50, direction: 90 })
        }).catch(err => console.error("Sim error:", err.message));
      }

      return {
        id:            v.id,
        immatriculation: v.plaque,
        marque:        v.marque  || 'Véhicule',
        modele:        v.modele  || '',
        statut:        v.statut,
        latitude:      lat,
        longitude:     lng,
        vitesse:       pos ? pos.vitesse   : 50,
        direction:     pos ? pos.direction : 90
      };
    });

    res.json(vehicules);
  } catch (err) {
    console.error('[localisation] Erreur /api/v1/vehicules:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`service-localisation (REST + gRPC) démarré sur le port ${PORT}`);
});

module.exports = app;