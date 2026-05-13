require('dotenv').config();
const { ApolloServer, gql } = require('apollo-server');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// 1. Charger le schéma GraphQL
const typeDefs = gql(fs.readFileSync(path.join(__dirname, '../graphQL/schema.graphql'), 'utf8'));

// 2. Configuration Keycloak (JWKS)
const jwksUri = process.env.KEYCLOAK_JWKS_URI || `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM || 'sgfv'}/protocol/openid-connect/certs`;
console.log(`[Gateway] Using JWKS URI: ${jwksUri}`);

const client = jwksClient({
  jwksUri: jwksUri,
  cache: true,
  rateLimit: true
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err || !key) {
      console.error('[Gateway] Erreur JWKS (clé introuvable ou invalide):', err ? err.message : 'Pas de clé');
      callback(err || new Error('Clé invalide'));
      return;
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// 3. Helper pour les appels REST
const createClient = (baseURL) => {
  return axios.create({
    baseURL,
    timeout: 5000,
  });
};

const services = {
  vehicules: createClient(process.env.SERVICE_VEHICULES_URL),
  conducteurs: createClient(process.env.SERVICE_CONDUCTEURS_URL),
  maintenance: createClient(process.env.SERVICE_MAINTENANCE_URL),
  localisation: createClient(process.env.SERVICE_LOCALISATION_URL),
  alertes: createClient(process.env.SERVICE_ALERTES_URL),
};

// Helper pour obtenir un token administrateur pour les opérations privilégiées
async function getAdminToken() {
  const params = new URLSearchParams();
  params.append('client_id', 'sgfv_public');
  params.append('username', 'admin');
  params.append('password', 'admin123');
  params.append('grant_type', 'password');

  const res = await axios.post(`${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/token`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Host': 'localhost:8180'
    }
  });
  return res.data.access_token;
}

// 4. Resolvers
const resolvers = {
  Query: {
    // Service Véhicules
    vehicules: async (_, { statut, marque }, { token }) => {
      try {
        console.log('[Gateway] Fetching vehicules...');
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.vehicules.get('/vehicules', {
          params: { statut, marque },
          headers: { Authorization: authHeader }
        });
        console.log(`[Gateway] Found ${res.data?.length || 0} vehicules`);
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Error fetching vehicules: ${err.message}`, err.response?.data || '');
        return [];
      }
    },
    vehicule: async (_, { id }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.vehicules.get(`/vehicules/${id}`, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },

    // Service Conducteurs
    conducteurs: async (_, { statutCompte, disponibilite }, { token }) => {
      try {
        console.log('[Gateway] Fetching conducteurs...');
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.conducteurs.get('/api/v1/conducteurs', {
          params: { statutCompte, disponibilite },
          headers: { Authorization: authHeader }
        });
        console.log(`[Gateway] Found ${res.data?.length || 0} conducteurs`);
        if (res.data && res.data.length > 0) {
          console.log('[Gateway] Sample conducteur:', JSON.stringify(res.data[0]));
        }
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Error fetching conducteurs: ${err.message}`, err.response?.data || '');
        return [];
      }
    },
    conducteur: async (_, { id }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.conducteurs.get(`/api/v1/conducteurs/${id}`, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    monProfil: async (_, __, { user, token }) => {
      if (!user) return null;
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const roles = user.realm_access?.roles || [];

      // On essaie d'abord le service correspondant au rôle prioritaire
      if (roles.includes('technicien')) {
        try {
          const res = await services.maintenance.get('/api/v1/techniciens/me', { headers: { Authorization: authHeader } });
          if (res.data) return res.data;
        } catch (e) { }
      }

      if (roles.includes('conducteur')) {
        try {
          const res = await services.conducteurs.get('/api/v1/conducteurs/me', { headers: { Authorization: authHeader } });
          if (res.data) return res.data;
        } catch (e) { }
      }

      // Si on n'a rien trouvé avec les rôles, on essaie quand même les deux au cas où (fallback)
      try {
        const res = await services.maintenance.get('/api/v1/techniciens/me', { headers: { Authorization: authHeader } });
        if (res.data) return res.data;
      } catch (e) { }

      try {
        const res = await services.conducteurs.get('/api/v1/conducteurs/me', { headers: { Authorization: authHeader } });
        if (res.data) return res.data;
      } catch (e) { }

      return null;
    },

    // Service Maintenance
    maintenances: async (_, { statut, vehiculeId }, { token }) => {
      try {
        console.log('[Gateway] Fetching maintenances...');
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.maintenance.get('/api/v1/maintenances', {
          params: { statut, vehiculeId },
          headers: { Authorization: authHeader }
        });
        console.log(`[Gateway] Found ${res.data?.length || 0} maintenances`);
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Error fetching maintenances: ${err.message}`, err.response?.data || '');
        return [];
      }
    },
    maintenance: async (_, { id }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.get(`/api/v1/maintenances/${id}`, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    historiqueMaintenance: async (_, { vehiculeId }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.get('/api/v1/maintenances', {
        params: { vehiculeId },
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    techniciens: async (_, __, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.maintenance.get('/api/v1/techniciens', {
          headers: { Authorization: authHeader }
        });
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Error fetching techniciens: ${err.message}`);
        return [];
      }
    },
    technicien: async (_, { id }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.get(`/api/v1/techniciens/${id}`, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },

    // Service Alertes
    alertes: async (_, { niveau, estLu, typeEvenement, role }, { token }) => {
      try {
        console.log(`[Gateway] Fetching alertes (role=${role || 'all'})...`);
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.alertes.get('/api/alertes', {
          params: { niveau, estLu, typeEvenement, role },
          headers: { Authorization: authHeader }
        });
        console.log(`[Gateway] Found ${res.data?.length || 0} alertes`);
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Error fetching alertes: ${err.message}`, err.response?.data || '');
        if (err.response?.status === 403) {
          return []; // Retourne une liste vide si accès refusé (ex: conducteur demandant toutes les alertes)
        }
        throw err;
      }
    },
    mesAlertes: async (_, __, { user, token }) => {
      try {
        if (!user) return [];
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.alertes.get('/api/alertes/moi', {
          headers: { Authorization: authHeader }
        });
        return res.data || [];
      } catch (err) {
        console.error(`[Gateway] Error fetching my alerts: ${err.message}`);
        return [];
      }
    },

    // Service Localisation
    trajetVehicule: async (_, { vehiculeId, debut, fin }, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.localisation.get(`/api/v1/positions/vehicule/${vehiculeId}`, {
          params: { debut, fin },
          headers: { Authorization: authHeader }
        });
        return res.data || [];
      } catch (err) {
        console.error(`[Gateway] Error fetching trajet: ${err.message}`);
        return [];
      }
    },
    zones: async (_, __, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.localisation.get('/api/v1/zones', {
          headers: { Authorization: authHeader }
        });
        const zones = extractData(res.data);
        return zones.map(z => ({
          ...z,
          latitudeCentre: z.latitudeCentre ?? 48.8566,
          longitudeCentre: z.longitudeCentre ?? 2.3522,
          rayonMetres: z.rayonMetres ?? 500
        }));
      } catch (err) {
        console.error(`[Gateway] Error fetching zones: ${err.message}`);
        return [];
      }
    },
    dernierePosition: async (_, { vehiculeId }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.localisation.get(`/api/v1/positions/vehicule/${vehiculeId}`, {
        params: { limit: 1 },
        headers: { Authorization: authHeader }
      });
      if (res.data && res.data.length > 0) {
        const p = res.data[0];
        return {
          ...p,
          vitesse: p.vitesse ?? 0,
          direction: p.direction ?? 0
        };
      }
      return null;
    },
    positionsActuelles: async (_, __, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.localisation.get('/api/v1/vehicules', {
          headers: { Authorization: authHeader }
        });
        const data = extractData(res.data);
        return data.map(p => ({
          ...p,
          vehiculeId: p.id || p.vehiculeId,
          vitesse: p.vitesse ?? 0,
          direction: p.direction ?? 0
        }));
      } catch (err) {
        console.error(`[Gateway] Error fetching positionsActuelles: ${err.message}`);
        return [];
      }
    },
  },

  Vehicule: {
    conducteurAssigne: async (parent, _, { token }) => {
      if (!parent.conducteurAssigneId) return null;
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.conducteurs.get(`/api/v1/conducteurs/${parent.conducteurAssigneId}`, {
          headers: { Authorization: authHeader }
        });
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Error fetching conducteurAssigne for vehicle ${parent.id}: ${err.message}`);
        return null;
      }
    }
  },
  Conducteur: {
    vehiculeAssigne: async (parent, _, { token }) => {
      if (!parent.vehiculeAssigneId) return null;
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.vehicules.get(`/vehicules/${parent.vehiculeAssigneId}`, {
          headers: { Authorization: authHeader }
        });
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Error fetching vehiculeAssigne for conducteur ${parent.id}: ${err.message}`);
        return null;
      }
    }
  },

  Mutation: {
    // Service Véhicules
    creerVehicule: async (_, args, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.vehicules.post('/vehicules', args, {
          headers: { Authorization: authHeader }
        });
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Erreur creerVehicule: ${err.message}`, err.response?.data || '');
        throw new Error(err.response?.data?.message || err.message);
      }
    },
    modifierVehicule: async (_, args, { token }) => {
      const { id, ...updateData } = args;
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        console.log(`[Gateway] Modification véhicule ${id} avec:`, updateData);
        const res = await services.vehicules.put(`/vehicules/${id}`, updateData, {
          headers: { Authorization: authHeader }
        });
        return res.data || { id, ...updateData };
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message;
        console.error(`[Gateway] Erreur modifierVehicule (ID: ${id}): ${errorMsg}`);
        throw new Error(errorMsg);
      }
    },
    changerStatutVehicule: async (_, { id, statut }, { token }) => {
      try {
        const adminToken = await getAdminToken();
        const res = await services.vehicules.patch(`/vehicules/${id}/statut`, { statut }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });

        // Synchroniser la disponibilité du conducteur assigné
        const vehicule = res.data;
        if (vehicule && vehicule.conducteurAssigneId) {
          try {
            let newDispo = null;
            if (statut === 'EN_MISSION') {
              newDispo = 'EN_MISSION';
            } else if (statut === 'DISPONIBLE' || statut === 'EN_MAINTENANCE' || statut === 'HORS_SERVICE') {
              newDispo = 'DISPONIBLE';
            }
            if (newDispo) {
              await services.conducteurs.patch(
                `/api/v1/conducteurs/${vehicule.conducteurAssigneId}/disponibilite`,
                { disponibilite: newDispo },
                { headers: { Authorization: `Bearer ${adminToken}` } }
              );
              console.log(`[Gateway] Conducteur ${vehicule.conducteurAssigneId} → ${newDispo}`);
            }
          } catch (syncErr) {
            console.error(`[Gateway] Erreur sync disponibilité conducteur: ${syncErr.message}`);
          }
        }

        return vehicule;
      } catch (err) {
        console.error(`[Gateway] Erreur changerStatutVehicule: ${err.message}`, err.response?.data || '');
        throw err;
      }
    },
    assignerConducteur: async (_, { vehiculeId, conducteurId }, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        // 1. Appeler le service Conducteurs pour créer l'assignation officielle
        // Ce service publiera un événement Kafka que le service Véhicules et le service Alertes écouteront.
        await services.conducteurs.post('/api/v1/assignations', { vehiculeId, conducteurId }, {
          headers: { Authorization: authHeader }
        });

        return { id: vehiculeId, conducteurAssigneId: conducteurId };
      } catch (err) {
        console.error(`[Gateway] Erreur assignerConducteur: ${err.message}`, err.response?.data || '');
        throw new Error(err.response?.data?.message || err.message);
      }
    },
    archiverVehicule: async (_, { id }, { token }) => {
      try {
        const adminToken = await getAdminToken();
        const res = await services.vehicules.delete(`/vehicules/${id}`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        return { id };
      } catch (err) {
        console.error(`[Gateway] Erreur archiverVehicule: ${err.message}`, err.response?.data || '');
        throw new Error(err.response?.data?.message || err.message);
      }
    },

    // Service Conducteurs
    creerConducteur: async (_, args, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.conducteurs.post('/api/v1/conducteurs', args, {
          headers: { Authorization: authHeader }
        });
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Erreur creerConducteur: ${err.message}`, err.response?.data || '');
        throw new Error(err.response?.data?.message || err.message);
      }
    },
    modifierConducteur: async (_, { id, ...args }, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.conducteurs.put(`/api/v1/conducteurs/${id}`, args, {
          headers: { Authorization: authHeader }
        });
        return res.data || { id, ...args };
      } catch (err) {
        console.error(`[Gateway] Erreur modifierConducteur: ${err.message}`, err.response?.data || '');
        throw new Error(err.response?.data?.message || err.message);
      }
    },
    changerStatutConducteur: async (_, { id, statutCompte }, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.conducteurs.patch(`/api/v1/conducteurs/${id}/statut`, { nouveauStatut: statutCompte }, {
          headers: { Authorization: authHeader }
        });
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Erreur changerStatutConducteur: ${err.message}`, err.response?.data || '');
        throw new Error(err.response?.data?.message || err.message);
      }
    },
    changerDisponibiliteConducteur: async (_, { id, disponibilite }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.conducteurs.patch(`/api/v1/conducteurs/${id}/disponibilite`, { disponibilite }, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    desactiverConducteur: async (_, { id }, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        await services.conducteurs.delete(`/api/v1/conducteurs/${id}`, {
          headers: { Authorization: authHeader }
        });
        return { id };
      } catch (err) {
        console.error(`[Gateway] Erreur desactiverConducteur: ${err.message}`, err.response?.data || '');
        throw new Error(err.response?.data?.message || err.message);
      }
    },
    supprimerConducteur: async (_, { id }, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        await services.conducteurs.delete(`/api/v1/conducteurs/${id}`, {
          headers: { Authorization: authHeader }
        });
        return true;
      } catch (err) {
        console.error(`[Gateway] Erreur supprimerConducteur: ${err.message}`, err.response?.data || '');
        throw new Error(err.response?.data?.message || err.message);
      }
    },

    // Service Maintenance
    signalerMaintenance: async (_, args, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.post('/api/v1/maintenances', args, {
        headers: { Authorization: authHeader }
      });

      // Orchestration : Mise à jour automatique du statut du véhicule
      try {
        const adminToken = await getAdminToken();
        const newStatut = args.typeIntervention === 'PANNE' ? 'EN_PANNE' : 'EN_MAINTENANCE';
        await services.vehicules.patch(`/vehicules/${args.vehiculeId}/statut`, { statut: newStatut }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`[Gateway] Statut du véhicule ${args.vehiculeId} mis à jour -> ${newStatut}`);
      } catch (err) {
        console.error(`[Gateway] Erreur synchronisation statut véhicule: ${err.message}`);
      }

      return res.data;
    },
    planifierMaintenance: async (_, { id, ...args }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.put(`/api/v1/maintenances/${id}/planifier`, args, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    cloturerMaintenance: async (_, { id, ...args }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.put(`/api/v1/maintenances/${id}/cloturer`, args, {
        headers: { Authorization: authHeader }
      });

      // Orchestration : Remettre le véhicule en statut DISPONIBLE
      try {
        const maintenance = res.data;
        if (maintenance && maintenance.vehiculeId) {
          const adminToken = await getAdminToken();
          await services.vehicules.patch(`/vehicules/${maintenance.vehiculeId}/statut`, { statut: 'DISPONIBLE' }, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          console.log(`[Gateway] Statut du véhicule ${maintenance.vehiculeId} remis à DISPONIBLE`);
        }
      } catch (err) {
        console.error(`[Gateway] Erreur synchronisation statut véhicule (clôture): ${err.message}`);
      }

      return res.data;
    },
    demarrerMaintenance: async (_, { id, ...args }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.put(`/api/v1/maintenances/${id}/demarrer`, args, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    annulerMaintenance: async (_, { id, ...args }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.put(`/api/v1/maintenances/${id}/annuler`, args, {
        headers: { Authorization: authHeader }
      });

      // Orchestration : Remettre le véhicule en statut DISPONIBLE
      try {
        const maintenance = res.data;
        if (maintenance && maintenance.vehiculeId) {
          const adminToken = await getAdminToken();
          await services.vehicules.patch(`/vehicules/${maintenance.vehiculeId}/statut`, { statut: 'DISPONIBLE' }, {
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          console.log(`[Gateway] Statut du véhicule ${maintenance.vehiculeId} remis à DISPONIBLE (annulation)`);
        }
      } catch (err) {
        console.error(`[Gateway] Erreur synchronisation statut véhicule (annulation): ${err.message}`);
      }

      return res.data;
    },
    creerTechnicien: async (_, args, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.post('/api/v1/techniciens', args, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    modifierTechnicien: async (_, { id, ...args }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.maintenance.put(`/api/v1/techniciens/${id}`, args, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    supprimerTechnicien: async (_, { id }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      await services.maintenance.delete(`/api/v1/techniciens/${id}`, {
        headers: { Authorization: authHeader }
      });
      return true;
    },

    // Service Alertes
    marquerAlerteLue: async (_, { id }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.alertes.patch(`/api/alertes/${id}/lire`, {}, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    supprimerAlerte: async (_, { id }, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        await services.alertes.delete(`/api/alertes/${id}`, {
          headers: { Authorization: authHeader }
        });
        return true;
      } catch (err) {
        console.error(`[Gateway] Erreur supprimerAlerte: ${err.message}`);
        return false;
      }
    },

    // Service Localisation
    creerZone: async (_, args, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.localisation.post('/api/v1/zones', args, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    supprimerZone: async (_, { id }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      try {
        await services.localisation.delete(`/api/v1/zones/${id}`, {
          headers: { Authorization: authHeader }
        });
        return true;
      } catch (err) {
        console.error('[Gateway] Erreur supprimerZone:', err.message);
        return false;
      }
    },
  }
};

// 5. Initialisation du serveur
const server = new ApolloServer({
  typeDefs,
  resolvers,
  csrfPrevention: true,
  cache: 'bounded',
  cors: {
    origin: ["https://studio.apollographql.com", "http://localhost:4000", "http://localhost:3000", "http://localhost:3005", "http://127.0.0.1:4000", "http://127.0.0.1:3005"],
    credentials: true
  },
  context: async ({ req }) => {
    console.log(`[Gateway] Incoming request: ${req.method} ${req.body?.operationName || ''}`);
    const token = req.headers.authorization || '';
    if (token) {
      try {
        const decoded = await new Promise((resolve, reject) => {
          jwt.verify(token.replace('Bearer ', ''), getKey, {
            algorithms: ['RS256']
          }, (err, decoded) => {
            if (err) reject(err);
            resolve(decoded);
          });
        });
        console.log(`[Gateway] Token valid for user: ${decoded.preferred_username || decoded.sub}`);
        return { user: decoded, token };
      } catch (e) {
        console.error('[Gateway] Erreur de validation du token:', e.message);
      }
    } else {
      console.warn('[Gateway] No authorization header found');
    }
    return { token: '' };
  },
  formatError: (err) => {
    console.error('[Gateway] GraphQL Error:', err.message);

    // Si c'est une erreur propagée par nos catch blocks (new Error(err.response?.data?.message || err.message))
    // On essaie de voir si c'est un message JSON Stringifié ou juste du texte
    let message = err.message;

    // Détection des erreurs Axios non catchées proprement
    if (err.extensions && err.extensions.exception && err.extensions.exception.isAxiosError) {
      const axiosErr = err.extensions.exception;
      message = axiosErr.response?.data?.message || axiosErr.message;
    }

    return {
      message: message,
      path: err.path,
      code: err.extensions?.code || 'INTERNAL_SERVER_ERROR'
    };
  },
});

const PORT = process.env.PORT || 4000;
server.listen({ port: PORT }).then(({ url }) => {
  console.log(`🚀 Gateway Apollo prêt sur ${url}`);
});
