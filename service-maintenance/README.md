# Service Maintenance 🔧

Le **Service Maintenance** assure la planification des interventions techniques et le suivi de l'état de santé de la flotte.

## 🛠️ Stack Technologique
- **Langage** : Java 21
- **Framework** : Spring Boot 3.2
- **Base de données** : PostgreSQL
- **Messagerie** : Apache Kafka (Consommation des alertes de maintenance)

## 📁 Structure du Projet
```text
src/main/java/com/sgfv/maintenance/
├── controller/    # Planning API
├── service/       # Calcul des maintenances préventives
├── repository/    # Interventions history
└── model/         # MaintenanceTask, Intervention
```

## 🚀 API Endpoints
| Méthode | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/maintenances/planning` | Voir le planning à venir |
| `POST` | `/api/maintenances/report` | Déclarer une intervention terminée |
| `GET` | `/api/maintenances/alerts` | Liste des véhicules nécessitant une révision |

## 📦 Docker
Image Docker optimisée via multi-stage build.
```bash
docker build -t sgfv/service-maintenance .
```
