require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8084;

// Health check pour Kubernetes
app.get('/health', (req, res) => {
  res.json({ status: 'UP', service: 'service-localisation' });
});

// TODO : ajouter les routes (positions GPS, zones géofencing)

app.listen(PORT, () => {
  console.log(`service-localisation démarré sur le port ${PORT}`);
});

module.exports = app;