const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const db = require('../config/db');
const { sendGeofenceAlert } = require('../kafka/producer');

const PROTO_PATH = path.join(__dirname, '../proto/gps.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const gpsProto = grpc.loadPackageDefinition(packageDefinition).gps;

const { Pool } = require('pg');
const vehPool = new Pool({
  host:     process.env.VEHICULES_DB_HOST     || 'postgres-vehicules',
  port:     parseInt(process.env.VEHICULES_DB_PORT || '5432'),
  database: process.env.VEHICULES_DB_NAME     || 'vehicules_db',
  user:     process.env.VEHICULES_DB_USER     || 'sgfv',
  password: process.env.VEHICULES_DB_PASSWORD || 'sgfv_secret',
});

/**
 * Logique du flux de positions (Client Streaming)
 */
const streamPositions = (call, callback) => {
  let count = 0;

  call.on('data', async (position) => {
    const { vehicule_id, latitude, longitude, vitesse, direction, horodatage } = position;
    
    try {
      // 1. Vérifier si le véhicule est EN_MISSION avant de traiter quoi que ce soit
      const vehCheck = await vehPool.query(
        "SELECT statut FROM vehicules WHERE id = $1",
        [vehicule_id]
      );
      
      if (!vehCheck.rows.length || vehCheck.rows[0].statut !== 'EN_MISSION') {
        // Le véhicule n'est pas en mission, on ignore silencieusement la position
        return;
      }

      count++;
      
      // 2. Conversion de l'horodatage
      const date = horodatage ? new Date(horodatage.seconds * 1000 + horodatage.nanos / 1000000) : new Date();

      // 3. Insertion dans TimescaleDB
      await db.query(
        `INSERT INTO positions (horodatage, vehicule_id, latitude, longitude, vitesse, direction, point_geo)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($4, $3), 4326))`,
        [date, vehicule_id, latitude, longitude, vitesse, direction]
      );

      // 4. Vérification de Géo-fencing
      const zoneCheck = await db.query(
        `SELECT id, nom, type FROM zones 
         WHERE active = true 
         AND ST_Contains(geometrie, ST_SetSRID(ST_MakePoint($1, $2), 4326))
         LIMIT 1`,
        [longitude, latitude]
      );

      if (zoneCheck.rows.length > 0) {
        const zone = zoneCheck.rows[0];
        if (zone.type === 'INTERDITE') {
          console.warn(`[GEOFENCE] Alerte ! Véhicule ${vehicule_id} dans zone interdite : ${zone.nom}`);
          await sendGeofenceAlert(vehicule_id, 'INTERDITE', `Le véhicule est entré dans la zone interdite : ${zone.nom}`);
        }
      }

    } catch (err) {
      console.error('Erreur lors du traitement du point GPS:', err);
    }
  });

  call.on('end', () => {
    console.log(`Flux GPS terminé. ${count} points reçus.`);
    callback(null, {
      nombre_points_recus: count,
      message: 'Flux traité avec succès',
      succes: true
    });
  });
};

/**
 * Démarrage du serveur gRPC
 */
const startGrpcServer = () => {
  const server = new grpc.Server();
  server.addService(gpsProto.GPSTracking.service, { StreamPositions: streamPositions });
  
  const port = process.env.GRPC_PORT || '3001';
  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('Erreur démarrage serveur gRPC:', err);
      return;
    }
    console.log(`Serveur gRPC (Localisation) démarré sur le port ${port}`);
    server.start();
  });
};

module.exports = { startGrpcServer };
