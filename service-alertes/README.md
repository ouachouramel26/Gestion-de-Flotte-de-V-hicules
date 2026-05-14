# Service Alertes 🔔

Le **Service Alertes** centralise toutes les notifications du système, qu'elles soient liées à la maintenance, à la localisation ou à la sécurité.

## 🛠️ Stack Technologique
- **Langage** : Node.js
- **Base de données** : PostgreSQL
- **Messagerie** : Apache Kafka (Consommateur de tous les topics d'alertes)

## 🚀 Fonctionnalités
- **Agrégation** : Regroupe les alertes par sévérité.
- **Persistence** : Historique complet des événements critiques.
- **Notification** : Prêt pour intégration avec des services tiers (Email, Slack, Push).

## 📁 Structure
```text
src/
├── kafka/         # Consumer pour maintenance-events, loc-alerts, etc.
├── migrations/    # Schéma de la table alertes
└── app.js         # Logique de traitement des événements
```

## 📦 Docker
Utilisation de l'image `node:18-alpine` pour une empreinte minimale.
