# API Gateway (Apollo GraphQL) 🧠

La **Gateway** est le point d'entrée unique pour tous les clients du système SGFV. Elle agrège les données provenant de multiples microservices REST et gRPC pour offrir une API unifiée.

## 🛠️ Stack Technologique
- **Framework** : Apollo Server (GraphQL)
- **Langage** : Node.js
- **Aggregation** : GraphQL Federation / Schema Stitching

## 🚀 Fonctionnalités
- **Point d'entrée unique** : Évite aux clients de connaître l'adresse de chaque microservice.
- **Optimisation** : Réduit le nombre de requêtes HTTP depuis le frontend (Over-fetching / Under-fetching).
- **Sécurité** : Validation des tokens Keycloak (JWT) avant de propager les requêtes aux services internes.

## 📁 Structure
```text
src/
├── graphQL/       # Schémas et Résolveurs
├── REST/          # Clients pour interagir avec les services Spring Boot
└── app.js         # Configuration Apollo Gateway
```

## 📦 Docker
```bash
docker build -t sgfv/api-gateway .
```
