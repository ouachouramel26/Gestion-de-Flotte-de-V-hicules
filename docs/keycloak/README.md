# Configuration de la Sécurité (Keycloak) 🔐

SGFV utilise **Keycloak** comme serveur d'identité et d'accès (SSO), implémentant le protocole OAuth2 / OpenID Connect.

## 👥 Rôles et Autorisations (RBAC)

Le système définit 4 rôles principaux :

| Rôle | Description | Droits |
| :--- | :--- | :--- |
| **`admin`** | Administrateur Système | Accès total, gestion des utilisateurs, suppression de véhicules... |
| **`technician`** | Technicien Maintenance | Consultation et validation des interventions de maintenance. |
| **`Conducteur`** | Conducteur | Accès en lecture seule à son profil et sa localisation. |

## 📁 Fichier de Configuration
- **`realm-export.json`** : Contient la définition du realm `sgfv`, des rôles, des clients (`sgfv_public`) et des utilisateurs de test.

## 🚀 Importation manuelle
Si vous souhaitez importer manuellement la configuration dans une instance Keycloak vierge :
1. Connectez-vous à la console d'administration.
2. Allez dans **Create Realm** > **Browse** > Sélectionnez `realm-export.json`.

## 🛡️ Sécurité Inter-Services
Les communications entre la Gateway et les microservices sont protégées par la validation du JWT. Chaque microservice vérifie la signature du token via l'endpoint de certificat de Keycloak.
