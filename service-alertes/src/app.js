require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3002;

// Health check pour Kubernetes
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'service-alertes' });
});

// TODO : ajouter les routes (alertes, notifications)

app.listen(PORT, () => {
  console.log(`service-alertes démarré sur le port ${PORT}`);
});

module.exports = app;