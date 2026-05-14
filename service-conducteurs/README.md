# Service Conducteurs 👤

Le **Service Conducteurs** gère les profils des chauffeurs, leurs permis de conduire et leurs assignations aux véhicules.

## 🛠️ Stack Technologique
- **Langage** : Java 21
- **Framework** : Spring Boot 3.2
- **Base de données** : PostgreSQL
- **Messagerie** : Apache Kafka (Consommateur d'événements de véhicules)
- **Sécurité** : Keycloak RBAC (Contrôle d'accès par rôle)

## 📁 Structure du Projet
```text
src/main/java/com/sgfv/conducteurs/
├── controller/    # API REST
├── service/       # Logique d'assignation
├── repository/    # Spring Data JPA
├── model/         # Entités (Driver, License)
└── config/        # Keycloak & Swagger config
```

## 🚀 API Endpoints
| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/conducteurs` | Liste tous les conducteurs |
| `POST` | `/api/conducteurs` | Ajouter un conducteur |
| `PUT` | `/api/conducteurs/assign` | Assigner un conducteur à un véhicule |

## 🧪 Tests
- Tests unitaires avec JUnit 5.
- Tests d'intégration avec base de données de test.

## 📦 Docker
Dockerfile multi-stage inclus pour un build reproductible et une image de production minimale.
