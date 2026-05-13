require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./config/db');
const { runConsumer } = require('./kafka/consumer');
const { authenticate, authorize } = require('./middleware/auth');

const app = express();

// CORS pour le frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3005'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT || 3002;

// Démarrer le consommateur Kafka
// Démarrer le consommateur Kafka avec retry
const startKafka = async () => {
  try {
    await runConsumer();
    console.log('Kafka Consumer (Alertes) connecté avec succès');
  } catch (err) {
    console.error('Erreur Kafka Consumer (retry dans 5s):', err.message);
    setTimeout(startKafka, 5000);
  }
};
startKafka();

// --- ROUTES ---

// Récupérer toutes les alertes — admin et technicien
app.get('/api/alertes',
  authenticate,
  authorize('admin', 'technicien'),
  async (req, res) => {
    try {
      const { niveau, estLu, typeEvenement, role } = req.query;
      let query = `
        SELECT 
          id, 
          type_evenement as "typeEvenement", 
          niveau, 
          role_destinataire as "roleDestinataire", 
          vehicule_id as "vehiculeId", 
          message, 
          est_lu as "estLu", 
          plaque,
          date_creation as "dateCreation" 
        FROM alertes WHERE 1=1`;
      const params = [];

      if (niveau) {
        params.push(niveau);
        query += ` AND niveau = $${params.length}`;
      }
      if (estLu) {
        params.push(estLu === 'true');
        query += ` AND est_lu = $${params.length}`;
      }
      if (typeEvenement) {
        params.push(typeEvenement);
        query += ` AND type_evenement = $${params.length}`;
      }
      if (role) {
        params.push(role);
        query += ` AND role_destinataire = $${params.length}`;
      }

      // Filtre de sécurité : Si ce n'est pas un admin, il ne voit que ses alertes strictement personnelles
      if (!req.userRoles.includes('admin')) {
        params.push(req.user.sub);
        query += ` AND utilisateur_id = $${params.length}`;
      } else if (!role) {
        // L'admin voit tout SAUF les alertes destinées EXCLUSIVEMENT aux conducteurs (si aucun rôle spécifié)
        query += " AND (role_destinataire IN ('ADMIN', 'TECHNICIEN') OR role_destinataire IS NULL)";
      }

      query += ' ORDER BY date_creation DESC';
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error('Erreur lors de la récupération des alertes:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Récupérer les alertes de l'utilisateur connecté — intelligent selon le rôle
app.get('/api/alertes/moi',
  authenticate,
  authorize('admin', 'technicien', 'conducteur'),
  async (req, res) => {
    try {
      const sub = req.user.sub;
      const isAdmin = req.userRoles.includes('admin');

      let query = `
        SELECT 
          id, type_evenement as "typeEvenement", niveau, 
          role_destinataire as "roleDestinataire", vehicule_id as "vehiculeId", 
          message, est_lu as "estLu", plaque, date_creation as "dateCreation" 
        FROM alertes WHERE `;
      
      const params = [sub];
      // On voit ses alertes perso (utilisateur_id) OU les alertes destinées à son rôle Admin
      if (isAdmin) {
        query += "(utilisateur_id = $1 OR role_destinataire = 'ADMIN')";
      } else {
        query += "utilisateur_id = $1";
      }

      query += " ORDER BY date_creation DESC";
      
      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (err) {
      console.error('Erreur /alertes/moi:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Marquer une alerte comme lue — tous les rôles
app.patch('/api/alertes/:id/lire',
  authenticate,
  authorize('admin', 'technicien', 'conducteur'),
  async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[Alertes] Tentative de lecture de l'alerte ${id} par l'utilisateur ${req.user.sub}`);

      const result = await db.query(
        `UPDATE alertes SET est_lu = true, date_lecture = NOW() 
         WHERE id = $1 
         RETURNING id, est_lu as "estLu", date_lecture as "dateLecture"`,
        [id]
      );
      if (result.rows.length === 0) {
        console.warn(`[Alertes] Alerte ${id} introuvable pour mise à jour`);
        return res.status(404).json({ error: 'Alerte introuvable' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('Erreur lors du marquage comme lu:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Supprimer une alerte — ADMIN UNIQUEMENT
app.delete('/api/alertes/:id',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.query('DELETE FROM alertes WHERE id = $1', [id]);

      if (result.rowCount === 0) return res.status(404).json({ error: 'Alerte introuvable' });
      res.status(204).send();
    } catch (err) {
      console.error('Erreur suppression alerte:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// Health check public
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'service-alertes' });
});

app.listen(PORT, () => {
  console.log(`service-alertes démarré sur le port ${PORT}`);
});

module.exports = app;