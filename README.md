# SGFV - Système Global de Gestion de Flotte de Véhicules 🏎️📡

## 🎓 Projet Master 1 - Architecture Micro-Services & Cloud-Native

Bienvenue dans le projet **SGFV**, une plateforme complète conçue pour la gestion moderne de flottes automobiles. Ce projet démontre la maîtrise d'une stack technologique avancée distribuée.

---

## 🏗️ Architecture Technique

Le système repose sur une architecture en **microservices** hautement découplés :

### 🔙 Back-End (Écosystème Distribué)
- **API Gateway (Apollo GraphQL)** : Point d'entrée unique agrégeant les données des différents services. 🧠
- **Service Véhicules (Java/Spring Boot)** : Gestion du cycle de vie des véhicules, stockage Postgres.
- **Service Conducteurs (Java/Spring Boot)** : Gestion des chauffeurs et assignations.
- **Service Maintenance (Java/Spring Boot)** : Alertes et planification technique.
- **Service Localisation (Node.js/gRPC)** : Tracking GPS en temps réel via streaming binaire. 🛰️
- **Bus d'événements (Apache Kafka)** : Communication asynchrone pour garantir la cohérence (Saga Pattern). 📩

### ⚡ Front-End (Micro-Frontends)
- **App Shell (Host)** : Orchestrateur principal gérant l'authentification et le dashboard.
- **Remote Map (Micro-Frontend)** : Module spécialisé en cartographie Leaflet, injecté dynamiquement via **Module Federation**.
- **Sécurité (Keycloak)** : Authentification unifiée (SSO) et contrôle d'accès basé sur les rôles (RBAC). 🔐

---

## 🛠️ Stack Technologique

| Domaine | Technologies |
| :--- | :--- |
| **Langages** | Java 21, JavaScript (Node.js), SQL |
| **Frameworks** | Spring Boot 3.2, React 18, Apollo GraphQL |
| **Infrastructure** | Kubernetes (Minikube), Docker Compose |
| **Streaming** | Apache Kafka, gRPC |
| **Observabilité** | OpenTelemetry, Prometheus, Actuator |
| **Tests** | JUnit 5, JaCoCo (80% coverage), Cypress (E2E) |

---

## 🚀 Guide de Lancement Rapide (Local)

### 1. Démarrer l'Infrastructure
```powershell
docker-compose up -d
```

### 2. Démarrer les Services (Back-End)
```powershell
# Dans chaque dossier /service-*
mvn spring-boot:run

# Dans /api (Gateway)
npm start
```

### 3. Démarrer le Front-End
```powershell
# Dans /frontend-v2/mf-shell
npm run dev
```

Accès : `http://localhost:3000` (Login Keycloak requis)

---

## 🏆 Points Forts du Projet
- **Consistance Event-Driven** : Utilisation de Kafka pour synchroniser les états entre services.
- **Micro-Frontend Architecture** : Découpage réel de l'UI pour une scalabilité maximale.
- **Observabilité Standardisée** : Tracing distribué intégré via OpenTelemetry.
- **Tests k6 (Performance)** : Script de simulation de charge pour valider la scalabilité.
- **Sécurité Industrielle** : Intégration complète avec un serveur d'identité (Keycloak).

---

## 📖 Livrables de Spécialisation (Semaine 7)

Pour répondre aux exigences de haute disponibilité et de maintenance industrielle, les livrables suivants ont été ajoutés :

1. **Observabilité Avancée** (`/infrastructure`) :
   - Dashboards Grafana pré-configurés (JSON).
   - Provisioning Prometheus et OpenTelemetry Collector.
2. **Décisions d'Architecture** (`/docs/adr`) :
   - Justification de l'usage de Kafka vs RabbitMQ.
   - Justification du streaming gRPC.
3. **Validation de Charge** (`/scripts`) :
   - Test de montée en charge progressive via k6.

---
