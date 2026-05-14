# Service Localisation 🛰️

Le **Service Localisation** est responsable du tracking GPS en temps réel. Il utilise des technologies de streaming performantes pour gérer les flux de données massifs.

## 🛠️ Stack Technologique
- **Langage** : Node.js (Express)
- **Protocole** : gRPC (Streaming binaire pour les positions)
- **Base de données** : TimescaleDB (PostgreSQL optimisé pour les séries temporelles)
- **Messagerie** : Apache Kafka (Publication des entrées/sorties de zones : Geofencing)

## 📁 Structure du Projet (Listing 1)
```text
src/
├── grpc/          # Implémentation du serveur gRPC
├── kafka/         # Producteur d'alertes géographiques
├── migrations/    # Schémas TimescaleDB
├── config/        # Configuration environnement
└── app.js         # Point d'entrée principal
```

## 🚀 Fonctionnalités
- **Tracking Temps Réel** : Réception des coordonnées via flux gRPC.
- **Historique Spatial** : Requêtes optimisées sur les trajectoires passées.
- **Geofencing** : Détection automatique quand un véhicule quitte une zone autorisée.

## 📦 Docker
Dockerfile optimisé pour Node.js avec utilisateur non-root pour la sécurité.
```bash
docker build -t sgfv/service-localisation .
```
