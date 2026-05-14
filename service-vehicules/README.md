# Service Véhicules 🚗

Le **Service Véhicules** est le cœur de la gestion du parc automobile du système SGFV. Il permet de gérer le cycle de vie complet des véhicules (création, mise à jour, suppression, historique).

## 🛠️ Stack Technologique
- **Langage** : Java 21
- **Framework** : Spring Boot 3.2
- **Base de données** : PostgreSQL
- **Messagerie** : Apache Kafka (Producteur d'événements `VEHICULE_CREE`, `VEHICULE_MAJ`)
- **Observabilité** : OpenTelemetry SDK, Micrometer (Prometheus)

## 📁 Structure du Projet
```text
src/main/java/com/sgfv/vehicules/
├── controller/    # Points d'entrée REST
├── service/       # Logique métier
├── repository/    # Accès aux données (Spring Data JPA)
├── model/         # Entités et DTOs
├── kafka/         # Producteurs/Consommateurs d'événements
└── config/        # Configuration (Security, Kafka, Swagger)
```

## 🚀 API Endpoints
| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/vehicules` | Liste tous les véhicules |
| `GET` | `/api/vehicules/{id}` | Détails d'un véhicule |
| `POST` | `/api/vehicules` | Créer un nouveau véhicule |
| `PUT` | `/api/vehicules/{id}` | Mettre à jour un véhicule |
| `DELETE` | `/api/vehicules/{id}` | Supprimer un véhicule |

## 🧪 Tests
- **Unitaires** : JUnit 5, Mockito
- **Intégration** : Testcontainers (PostgreSQL)
- **Couverture** : Visez 80% avec JaCoCo.

## 📦 Docker
Le service utilise un **Dockerfile multi-stage** optimisé :
1. `builder` : Compile le projet avec Maven.
2. `runtime` : Utilise une image JRE alpine légère pour l'exécution.

```bash
docker build -t sgfv/service-vehicules .
```
