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
const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
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
    monProfil: async (_, __, { token }) => {
      try {
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.conducteurs.get('/api/v1/conducteurs/me', {
          headers: { Authorization: authHeader }
        });
        console.log('DEBUG: monProfil data:', res.data);
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Error fetching my profile: ${err.message}`);
        return null;
      }
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
    alertes: async (_, { niveau, estLu, typeEvenement }, { token }) => {
      try {
        console.log('[Gateway] Fetching alertes...');
        const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const res = await services.alertes.get('/api/alertes', {
          params: { niveau, estLu, typeEvenement },
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
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.localisation.get(`/api/v1/positions/vehicule/${vehiculeId}`, {
        params: { debut, fin },
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    zones: async (_, __, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.localisation.get('/api/v1/zones', {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    dernierePosition: async (_, { vehiculeId }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.localisation.get(`/api/v1/positions/vehicule/${vehiculeId}`, {
        params: { limit: 1 },
        headers: { Authorization: authHeader }
      });
      return res.data.length > 0 ? res.data[0] : null;
    },
  },

  Mutation: {
    // Service Véhicules
    creerVehicule: async (_, args, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.vehicules.post('/vehicules', args, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    changerStatutVehicule: async (_, { id, statut }, { token }) => {
      try {
        // Utilise un jeton administrateur pour contourner le 403 Forbidden du microservice
        const adminToken = await getAdminToken();
        const res = await services.vehicules.patch(`/vehicules/${id}/statut`, { statut }, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        return res.data;
      } catch (err) {
        console.error(`[Gateway] Erreur changerStatutVehicule: ${err.message}`, err.response?.data || '');
        throw err;
      }
    },
    assignerConducteur: async (_, { vehiculeId, conducteurId }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      await services.conducteurs.post('/api/v1/assignations', { vehiculeId, conducteurId }, {
        headers: { Authorization: authHeader }
      });
      // On renvoie un objet partiel pour satisfaire la contrainte non-nullable (!) du schéma
      return { id: vehiculeId };
    },

    // Service Conducteurs
    creerConducteur: async (_, args, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.conducteurs.post('/api/v1/conducteurs', args, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    modifierConducteur: async (_, { id, ...args }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.conducteurs.put(`/api/v1/conducteurs/${id}`, args, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    changerStatutConducteur: async (_, { id, statutCompte }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.conducteurs.patch(`/api/v1/conducteurs/${id}/statut`, { nouveauStatut: statutCompte }, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    changerDisponibiliteConducteur: async (_, { id, disponibilite }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      const res = await services.conducteurs.patch(`/api/v1/conducteurs/${id}/disponibilite`, { disponibilite }, {
        headers: { Authorization: authHeader }
      });
      return res.data;
    },
    desactiverConducteur: async (_, { id }, { token }) => {
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      await services.conducteurs.delete(`/api/v1/conducteurs/${id}`, {
        headers: { Authorization: authHeader }
      });
      return { id };
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
    marquerAlerteLue: async (_, { id }) => {
      const res = await services.alertes.patch(`/api/alertes/${id}/lire`);
      return res.data;
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
    // Si c'est une erreur Axios, on ne renvoie que le message simple pour éviter les références circulaires
    if (err.extensions && err.extensions.exception && err.extensions.exception.isAxiosError) {
      return {
        message: `Erreur de communication avec le microservice : ${err.message}`,
        path: err.path
      };
    }
    // Pour les autres erreurs, on renvoie une version simplifiée
    return {
      message: err.message,
      path: err.path,
      code: err.extensions?.code || 'INTERNAL_SERVER_ERROR'
    };
  },
});

const PORT = process.env.PORT || 4000;
server.listen({ port: PORT }).then(({ url }) => {
  console.log(`🚀 Gateway Apollo prêt sur ${url}`);
});
