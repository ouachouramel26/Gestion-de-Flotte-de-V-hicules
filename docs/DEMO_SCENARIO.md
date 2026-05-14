# Scénario de Démonstration — SGFV 

Ce document guide la présentation du système SGFV étape par étape.

## 1. Préparation
- S'assurer que tous les pods sont `Running` : `kubectl get pods -n sgfv`
- Lancer le port-forwarding pour le Gateway, le Frontend et Grafana.
- Ouvrir le navigateur sur `http://localhost:3000`.

## 2. Authentification (Keycloak) 🔐
- Se connecter avec le compte `admin` / `admin123`.
- Montrer la redirection sécurisée vers Keycloak.

## 3. Gestion du Parc (Service Véhicules) 
- Naviguer vers **"Parc Automobile"**.
- Créer un nouveau véhicule (Plaque, Marque, Modèle).
- Vérifier que le véhicule apparaît dans la liste avec le statut `DISPONIBLE`.

## 4. Tracking Temps Réel (Service Localisation) 
- Naviguer vers **"Géo-Localisation"**.
- Activer la simulation de mouvement via le script : `node scripts/full_fleet_simulation.js`.
- Observer le véhicule bouger en temps réel sur la carte Leaflet.
- Expliquer l'usage de **gRPC Streaming** pour la fluidité.

## 5. Alertes & Maintenance (Saga Pattern) ⚠️
- Simuler l'entrée du véhicule dans une **Zone Interdite** (configurée dans le script ou via l'UI).
- Observer l'apparition d'une alerte immédiate dans la cloche de notification.
- Naviguer vers **"Maintenance"** pour voir si un check-up a été planifié automatiquement (Saga Kafka).

## 6. Observabilité (Grafana & Jaeger) 📊
- Ouvrir **Grafana** (`http://localhost:3001`).
- Montrer le dashboard **"SGFV Business Metrics"**.
- Ouvrir **Jaeger** pour montrer une trace distribuée d'une requête GraphQL traversant plusieurs services.

## 7. Conclusion
- Résumé de la stack : Spring Boot, Node.js, React, Kafka, gRPC, Kubernetes, Helm.
