const { Kafka } = require('kafkajs');
const db = require('../config/db');

const kafka = new Kafka({
  clientId: 'service-alertes',
  brokers: process.env.KAFKA_BROKERS.split(','),
});

const consumer = kafka.consumer({ groupId: 'alertes-group' });

// Fonctions de cache
async function getPlaque(vId) {
  const res = await db.query('SELECT plaque FROM vehicules_cache WHERE id = $1', [vId]);
  return res.rows.length > 0 ? res.rows[0].plaque : null;
}

async function getKeycloakIdFromInternal(cId) {
  const res = await db.query('SELECT keycloak_id FROM conducteurs_cache WHERE id = $1', [cId]);
  return res.rows.length > 0 ? res.rows[0].keycloak_id : cId;
}

async function insertAlerte(type, niveau, role, user_id, vId, plaque, message) {
  try {
    const finalPlaque = plaque || await getPlaque(vId);
    await db.query(
      'INSERT INTO alertes (type_evenement, niveau, role_destinataire, utilisateur_id, vehicule_id, plaque, message) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [type, niveau, role, user_id, vId, finalPlaque, message]
    );
  } catch (err) {
    console.error(`Erreur insertion alerte ${type}:`, err.message);
  }
}

async function getCurrentDriver(vId) {
  try {
    const res = await db.query('SELECT conducteur_id FROM vehicule_assignments_cache WHERE vehicule_id = $1', [vId]);
    return res.rows.length > 0 ? res.rows[0].conducteur_id : null;
  } catch (err) {
    return null;
  }
}

const runConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: ['conducteurs', 'maintenance', 'vehicules', 'localisation-events'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const rawValue = message.value.toString();
      const payload = JSON.parse(rawValue);

      try {
        const vId = payload.vehiculeId || payload.vehicule_id;
        let vPlaque = payload.plaque || payload.vehicule_plaque || null;
        const driverId = await getCurrentDriver(vId);

        // MISE À JOUR DES CACHES
        if (topic === 'vehicules' && (payload.event === 'vehicule.created' || payload.plaque)) {
           await db.query('INSERT INTO vehicules_cache (id, plaque) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET plaque = EXCLUDED.plaque', [vId, payload.plaque]);
        }
        if (topic === 'conducteurs' && payload.eventType === 'CONDUCTEUR_CREATED') {
           await db.query('INSERT INTO conducteurs_cache (id, keycloak_id) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET keycloak_id = EXCLUDED.keycloak_id', [payload.conducteurId, payload.keycloakId]);
        }

        // 1. GESTION DES ASSIGNATIONS
        if ((topic === 'conducteurs' && payload.eventType === 'CONDUCTEUR_ASSIGNED') || 
            (topic === 'vehicules' && payload.event === 'vehicule.assigned')) {
          
          let keycloakId = payload.keycloakId || payload.conducteurId || payload.conducteur_id;
          
          // Résolution de l'ID si c'est un UUID interne
          if (keycloakId && keycloakId.length > 30 && keycloakId.includes('-')) {
             const resolved = await getKeycloakIdFromInternal(keycloakId);
             if (resolved) keycloakId = resolved;
          }
          
          if (keycloakId) {
            await db.query(
              'INSERT INTO vehicule_assignments_cache (vehicule_id, conducteur_id) VALUES ($1, $2) ON CONFLICT (vehicule_id) DO UPDATE SET conducteur_id = EXCLUDED.conducteur_id, date_assignation = NOW()',
              [vId, keycloakId]
            );
            const plaqueLabel = vPlaque || await getPlaque(vId) || vId;
            await insertAlerte('VEHICULE_ASSIGNE', 'INFO', 'CONDUCTEUR', keycloakId, vId, vPlaque, `Le véhicule ${plaqueLabel} vous a été assigné.`);
          }
        }

        // 2. GESTION DE LA MAINTENANCE (Topic maintenance)
        else if (topic === 'maintenance') {
          const type = payload.eventType;
          const techId = payload.technicienId;

          if (type === 'MAINTENANCE_SIGNALED') {
            // Signalement -> Admin
            await insertAlerte('PANNE_SIGNALEE', 'AVERTISSEMENT', 'ADMIN', null, vId, vPlaque, `Une panne a été signalée sur le véhicule ${vPlaque || vId}.`);
          } 
          else if (type === 'MAINTENANCE_PLANNED') {
            // Planification -> Technicien assigné
            await insertAlerte('REVISION_PLANIFIEE', 'INFO', 'TECHNICIEN', techId, vId, vPlaque, `Une révision vous a été assignée pour le véhicule ${vPlaque || vId}.`);
          }
          else if (['MAINTENANCE_STARTED', 'MAINTENANCE_COMPLETED', 'MAINTENANCE_CANCELLED'].includes(type)) {
            let msg = '';
            if (type === 'MAINTENANCE_STARTED') msg = `La maintenance du véhicule ${vPlaque || vId} a débuté.`;
            if (type === 'MAINTENANCE_COMPLETED') msg = `La maintenance du véhicule ${vPlaque || vId} est terminée.`;
            if (type === 'MAINTENANCE_CANCELLED') msg = `La maintenance du véhicule ${vPlaque || vId} a été annulée.`;

            // Destinataires : Technicien + Conducteur + Admin
            if (techId) await insertAlerte(type, 'INFO', 'TECHNICIEN', techId, vId, vPlaque, msg);
            if (driverId) await insertAlerte(type, 'INFO', 'CONDUCTEUR', driverId, vId, vPlaque, msg);
            await insertAlerte(type, 'INFO', 'ADMIN', null, vId, vPlaque, msg);
          }
        }

        // 3. GESTION DE LA LOCALISATION (Topic localisation-events)
        else if (topic === 'localisation-events' || payload.eventType === 'SORTIE_ZONE') {
          const type = payload.eventType || 'SORTIE_ZONE';
          const msg = payload.message || `Alerte de localisation (${type}) pour le véhicule ${vPlaque || vId}.`;
          const niveau = payload.statut === 'ALERTE' ? 'CRITIQUE' : 'AVERTISSEMENT';

          // Destinataires : Conducteur + Admins
          if (driverId) await insertAlerte(type, niveau, 'CONDUCTEUR', driverId, vId, vPlaque, msg);
          await insertAlerte(type, niveau, 'ADMIN', null, vId, vPlaque, msg);
        }

        // 4. GESTION DES SEUILS ET PERMIS (Topic vehicules / conducteurs additionnels)
        else if (payload.eventType === 'PERMIS_EXPIRE' || payload.eventType === 'SEUIL_KM_ATTEINT') {
          const targetDriver = payload.conducteurId || driverId;
          const msg = payload.message || `Alerte ${payload.eventType} concernant le véhicule ${vPlaque || vId}.`;
          
          if (targetDriver) await insertAlerte(payload.eventType, 'AVERTISSEMENT', 'CONDUCTEUR', targetDriver, vId, vPlaque, msg);
          await insertAlerte(payload.eventType, 'AVERTISSEMENT', 'ADMIN', null, vId, vPlaque, msg);
        }

      } catch (err) {
        console.error('Erreur traitement message Kafka:', err);
      }
    },
  });
};

module.exports = { runConsumer };
