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

## 📖 Documentation Complète

Le projet est documenté en profondeur pour faciliter la maintenance et l'évolution :

### 🚀 Démarrage & Utilisation
- **[Guide de Lancement (Docker/K8s)](docs/GUIDE_LANCEMENT.md)**
- **[Guide Utilisateur (Fonctionnel)](docs/GUIDE_UTILISATEUR.md)**
- **[Comptes & Accès](docs/COMPTES.md)**

### 🏗️ Architecture & Technique
- **[Architecture Globale](ARCHITECTURE.md)**
- **[Décisions d'Architecture (ADR)](docs/adr/)**
- **[Sécurité & Keycloak](docs/keycloak/README.md)**
- **[Observabilité & Monitoring](infrastructure/README.md)**

### 📦 Micro-Services (READMEs individuels)
- [Service Véhicules](service-vehicules/README.md)
- [Service Conducteurs](service-conducteurs/README.md)
- [Service Maintenance](service-maintenance/README.md)
- [Service Localisation](service-localisation/README.md)
- [Service Alertes](service-alertes/README.md)
- [API Gateway](api/README.md)
- [Frontend React](frontend-v2/README.md)

---

## 🏆 Points Forts du Projet
- **Consistance Event-Driven** : Utilisation de Kafka pour synchroniser les états entre services.
- **Micro-Frontend Architecture** : Découpage réel de l'UI pour une scalabilité maximale.
- **Observabilité Standardisée** : Tracing distribué intégré via OpenTelemetry.
- **Tests de Charge** : Simulation via k6 pour valider la robustesse.
- **Déploiement K8s** : Manifestes complets pour une mise en production simulée.

---
*Projet Master 1 GIL - Université de Rouen - 2026*
