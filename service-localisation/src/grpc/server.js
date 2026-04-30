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

/**
 * Logique du flux de positions (Client Streaming)
 */
const streamPositions = (call, callback) => {
  let count = 0;

  call.on('data', async (position) => {
    count++;
    const { vehicule_id, latitude, longitude, vitesse, direction, horodatage } = position;
    
    // 1. Conversion de l'horodatage google.protobuf.Timestamp vers JS Date
    const date = horodatage ? new Date(horodatage.seconds * 1000 + horodatage.nanos / 1000000) : new Date();

    try {
      // 2. Insertion dans TimescaleDB avec conversion PostGIS
      await db.query(
        `INSERT INTO positions (horodatage, vehicule_id, latitude, longitude, vitesse, direction, point_geo)
         VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($4, $3), 4326))`,
        [date, vehicule_id, latitude, longitude, vitesse, direction]
      );

      // 3. Vérification de Géo-fencing (Moteur spatial PostGIS)
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
