const http = require('http');

const POSITIONS_API = 'http://localhost:8084/api/v1/positions';

// IDs récupérés directement de la base de données pour bypasser le Gateway/Auth
const vehicles = [
  { id: 'da4dd756-e21c-4a16-9a9c-b69fb21df58e', plaque: '12345678' },
  { id: 'aca78b2e-1860-44cb-bf13-412bea34136e', plaque: 'VOITURE' }
];

function post(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const body = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = http.request(options, (res) => {
      let d = '';
      res.on('data', (chunk) => d += chunk);
      res.on('end', () => resolve(d));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function startSimulation() {
  console.log('🚀 Simulation de mouvement lancée pour les véhicules en mission...');
  
  // États initiaux (Paris)
  const states = vehicles.map(v => ({
    ...v,
    lat: 48.8566 + (Math.random() - 0.5) * 0.02,
    lng: 2.3522 + (Math.random() - 0.5) * 0.02,
    direction: Math.random() * 360
  }));

  setInterval(async () => {
    for (const s of states) {
      // Mouvement fluide
      const speed = 0.0004; 
      s.lat += Math.cos(s.direction * Math.PI / 180) * speed;
      s.lng += Math.sin(s.direction * Math.PI / 180) * speed;
      
      // Virage aléatoire
      s.direction += (Math.random() - 0.5) * 15;

      // Garder dans une zone raisonnable autour de Paris
      if (Math.abs(s.lat - 48.8566) > 0.05) s.direction += 180;
      if (Math.abs(s.lng - 2.3522) > 0.05) s.direction += 180;

      try {
        await post(POSITIONS_API, {
          vehiculeId: s.id,
          latitude: s.lat,
          longitude: s.lng,
          vitesse: 40 + Math.random() * 20,
          direction: s.direction
        });
        process.stdout.write('.'); // Indicateur visuel
      } catch (err) {
        // console.error(`Erreur simulation ${s.plaque}:`, err.message);
      }
    }
  }, 2000);

  console.log('\n✅ Les voitures bougent maintenant sur la carte !');
  console.log('Appuyez sur Ctrl+C pour arrêter la simulation.');
}

startSimulation();
