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

function mapEventType(type) {
  const mapping = {
    'MAINTENANCE_COMPLETED': 'MAINTENANCE_TERMINEE',
    'MAINTENANCE_STARTED': 'MAINTENANCE_DEBUTEE',
    'MAINTENANCE_PLANNED': 'REVISION_PLANIFIEE'
  };
  return mapping[type] || type;
}

async function insertAlerte(type, niveau, role, user_id, vId, plaque, message) {
  try {
    const finalType = mapEventType(type);
    const finalPlaque = plaque || await getPlaque(vId);
    await db.query(
      'INSERT INTO alertes (type_evenement, niveau, role_destinataire, utilisateur_id, vehicule_id, plaque, message) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [finalType, niveau, role, user_id, vId, finalPlaque, message]
    );
  } catch (err) {
    console.error(`Erreur insertion alerte ${type} (mappé en ${mapEventType(type)}):`, err.message);
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

// Vérifier si une alerte similaire existe déjà dans les 5 dernières minutes (évite les doublons)
async function alertExists(vehiculeId, typeEvenement, roleDest) {
  try {
    const res = await db.query(
      `SELECT 1 FROM alertes WHERE vehicule_id = $1 AND type_evenement = $2 AND role_destinataire = $3 AND date_creation >= NOW() - INTERVAL '5 minutes' LIMIT 1`,
      [vehiculeId, typeEvenement, roleDest]
    );
    return res.rowCount > 0;
  } catch (err) {
    return false;
  }
}

async function getUserName(keycloakId) {
  try {
    const res = await db.query('SELECT prenom, nom FROM utilisateurs_cache WHERE keycloak_id = $1', [keycloakId]);
    if (res.rows.length > 0) {
      return `${res.rows[0].prenom} ${res.rows[0].nom}`;
    }
    return keycloakId;
  } catch (err) {
    return keycloakId;
  }
}

const runConsumer = async () => {
  let connected = false;
  while (!connected) {
    try {
      await consumer.connect();
      connected = true;
      console.log("[KAFKA] Connecté au broker avec succès !");
    } catch (err) {
      console.error("[KAFKA] Le broker n'est pas encore prêt, nouvelle tentative dans 5 secondes...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  await consumer.subscribe({ topics: ['conducteurs', 'maintenance', 'vehicules', 'localisation-events'], fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const rawValue = message.value.toString();
      console.log(`[KAFKA] Message reçu sur topic ${topic}`);
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

        // 1. GESTION DES ASSIGNATIONS ET STATUTS
        const isAssignmentEvent = (topic === 'conducteurs' && payload.eventType === 'CONDUCTEUR_ASSIGNED') ||
          (topic === 'vehicules' && payload.event === 'vehicule.assigned');

        // Alerte pour nouveau véhicule
        if (topic === 'vehicules' && payload.event === 'vehicule.created') {
          await insertAlerte('VEHICULE_CREE', 'INFO', 'ADMIN', null, vId, vPlaque, `Nouveau véhicule ajouté : ${vPlaque || vId}`);
        }

        // Alerte pour changement de statut
        if (topic === 'vehicules' && payload.event === 'vehicule.status.changed') {
          const nouveauStatut = payload.statut_nouveau || payload.statut;
          if (nouveauStatut === 'EN_PANNE') {
            const exists = await alertExists(vId, 'PANNE_SIGNALEE', 'ADMIN');
            if (!exists) {
              await insertAlerte('PANNE_SIGNALEE', 'AVERTISSEMENT', 'ADMIN', null, vId, vPlaque, `Le véhicule ${vPlaque || vId} est passé en panne.`);
              if (driverId) {
                await insertAlerte('PANNE_SIGNALEE', 'AVERTISSEMENT', 'CONDUCTEUR', driverId, vId, vPlaque, `Votre véhicule ${vPlaque || vId} est signalé en panne.`);
              }
            }
          }
        }

        if (isAssignmentEvent) {
          let keycloakId = payload.keycloakId || payload.conducteurId || payload.conducteur_id;

          // Résolution de l'ID si c'est un UUID interne
          if (keycloakId && keycloakId.length > 30 && keycloakId.includes('-')) {
            const resolved = await getKeycloakIdFromInternal(keycloakId);
            if (resolved) keycloakId = resolved;
          }

          if (keycloakId) {
            // Mise à jour du cache
            await db.query(
              'INSERT INTO vehicule_assignments_cache (vehicule_id, conducteur_id) VALUES ($1, $2) ON CONFLICT (vehicule_id) DO UPDATE SET conducteur_id = EXCLUDED.conducteur_id, date_assignation = NOW()',
              [vId, keycloakId]
            );

            // Alerte uniquement pour le topic 'conducteurs' pour éviter les doublons
            if (topic === 'conducteurs') {
              const plaqueLabel = vPlaque || await getPlaque(vId) || vId;
              const driverName = await getUserName(keycloakId);
              await insertAlerte('VEHICULE_ASSIGNE', 'INFO', 'CONDUCTEUR', keycloakId, vId, plaqueLabel, `Le véhicule ${plaqueLabel} vous a été assigné.`);
              await insertAlerte('VEHICULE_ASSIGNE', 'INFO', 'ADMIN', null, vId, plaqueLabel, `Le véhicule ${plaqueLabel} a été assigné au conducteur ${driverName}.`);
            }
          }
        }

        // 2. GESTION DE LA MAINTENANCE
        else if (topic === 'maintenance') {
          const type = payload.eventType;
          const techId = payload.technicienId;

          const resolvedPlaque = vPlaque || await getPlaque(vId) || vId;
          if (type === 'MAINTENANCE_SIGNALED') {
            const exists = await alertExists(vId, 'PANNE_SIGNALEE', 'ADMIN');
            if (!exists) {
              await insertAlerte('PANNE_SIGNALEE', 'AVERTISSEMENT', 'ADMIN', null, vId, resolvedPlaque, `Une panne a été signalée sur le véhicule ${resolvedPlaque}.`);
            }
          }
          else if (type === 'MAINTENANCE_PLANNED') {
            await insertAlerte('MAINTENANCE_PLANNED', 'INFO', 'TECHNICIEN', techId, vId, resolvedPlaque, `Une maintenance vous a été assignée pour le véhicule ${resolvedPlaque}.`);
            await insertAlerte('MAINTENANCE_PLANNED', 'INFO', 'ADMIN', null, vId, resolvedPlaque, `Une maintenance a été planifiée pour le véhicule ${resolvedPlaque}.`);
          }
          else if (['MAINTENANCE_STARTED', 'MAINTENANCE_COMPLETED', 'MAINTENANCE_CANCELLED'].includes(type)) {
            let msg = '';
            if (type === 'MAINTENANCE_STARTED') msg = `La maintenance du véhicule ${resolvedPlaque} a commencé.`;
            if (type === 'MAINTENANCE_COMPLETED') msg = `Maintenance terminée, la voiture ${resolvedPlaque} est de nouveau disponible.`;
            if (type === 'MAINTENANCE_CANCELLED') msg = `La maintenance du véhicule ${resolvedPlaque} a été annulée.`;

            if (techId) await insertAlerte(type, 'INFO', 'TECHNICIEN', techId, vId, resolvedPlaque, msg);
            if (driverId) await insertAlerte(type, 'INFO', 'CONDUCTEUR', driverId, vId, resolvedPlaque, msg);
            await insertAlerte(type, 'INFO', 'ADMIN', null, vId, resolvedPlaque, msg);
          }
        }

        // 3. GESTION DE LA LOCALISATION / ZONE INTERDITE
        else if (topic === 'localisation-events' || payload.eventType === 'SORTIE_ZONE') {
          const type = payload.eventType || 'SORTIE_ZONE';
          // Résoudre la plaque depuis le cache si elle n'est pas dans le payload
          const resolvedPlaque = vPlaque || await getPlaque(vId) || vId;
          let msg = payload.message || `Alerte de localisation (${type}) pour le véhicule ${resolvedPlaque}.`;
          if (type === 'SORTIE_ZONE' && payload.statut === 'ALERTE') {
            msg = `ALERTE : Entrée en zone interdite détectée (${resolvedPlaque})`;
          }
          const niveau = payload.statut === 'ALERTE' ? 'CRITIQUE' : 'AVERTISSEMENT';

          // Alerte conducteur (sans doublon sur 5 min)
          if (driverId) {
            const existsDriver = await alertExists(vId, type, 'CONDUCTEUR');
            if (!existsDriver) {
              await insertAlerte(type, niveau, 'CONDUCTEUR', driverId, vId, resolvedPlaque, msg);
            }
          }

          // Alerte admin (sans doublon sur 5 min)
          const existsAdmin = await alertExists(vId, type, 'ADMIN');
          if (!existsAdmin) {
            await insertAlerte(type, niveau, 'ADMIN', null, vId, resolvedPlaque, msg);
          }
        }

        // 4. GESTION DES SEUILS ET PERMIS
        else if (payload.eventType === 'PERMIS_EXPIRE' || payload.eventType === 'SEUIL_KM_ATTEINT') {
          const targetDriver = payload.conducteurId || driverId;
          const resPlaque = vPlaque || await getPlaque(vId) || vId;
          const msg = payload.message || `Alerte ${payload.eventType} concernant le véhicule ${resPlaque}.`;

          if (targetDriver) await insertAlerte(payload.eventType, 'AVERTISSEMENT', 'CONDUCTEUR', targetDriver, vId, resPlaque, msg);
          await insertAlerte(payload.eventType, 'AVERTISSEMENT', 'ADMIN', null, vId, resPlaque, msg);
        }

      } catch (err) {
        console.error('Erreur traitement message Kafka:', err);
      }
    },
  });
};

module.exports = { runConsumer };
