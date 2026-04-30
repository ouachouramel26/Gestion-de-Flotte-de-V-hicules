const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../service-localisation/src/proto/gps.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});

const gpsProto = grpc.loadPackageDefinition(packageDefinition).gps;

const client = new gpsProto.GPSTracking(
  'localhost:3001',
  grpc.credentials.createInsecure()
);

/**
 * Simulation d'un trajet GPS
 */
const simulateMovements = (vehiculeId) => {
  const stream = client.StreamPositions((err, response) => {
    if (err) {
      console.error('Erreur finale du stream:', err);
      return;
    }
    console.log('--- Fin de simulation ---');
    console.log('Message du serveur:', response.message);
    console.log('Points total envoyés:', response.nombre_points_recus);
  });

  // Coordonnées de départ (ex: Paris)
  let lat = 48.8566;
  let lng = 2.3522;

  console.log(`Début de la simulation pour le véhicule ${vehiculeId}...`);

  let count = 0;
  const interval = setInterval(() => {
    count++;
    
    // On simule un mouvement vers le Nord-Est
    lat += 0.001;
    lng += 0.001;
    const vitesse = 50 + Math.random() * 20; // 50-70 km/h

    const point = {
      vehicule_id: vehiculeId,
      latitude: lat,
      longitude: lng,
      vitesse: vitesse,
      direction: 45.0,
      horodatage: {
        seconds: Math.floor(Date.now() / 1000),
        nanos: (Date.now() % 1000) * 1000000
      }
    };

    console.log(`[Point ${count}] Envoi position: ${lat.toFixed(4)}, ${lng.toFixed(4)} (${vitesse.toFixed(1)} km/h)`);
    stream.write(point);

    if (count >= 10) {
      clearInterval(interval);
      stream.end();
    }
  }, 1000); // 1 point par seconde
};

// Utilisation d'un ID de véhicule récupéré précédemment
const vehiculeId = process.argv[2] || '791e166e-e579-48b3-8e4d-1e1729318435';
simulateMovements(vehiculeId);
