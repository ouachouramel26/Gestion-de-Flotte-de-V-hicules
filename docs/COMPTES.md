# 🔐 Récapitulatif des Comptes et Accès

Ce document liste les comptes pré-configurés pour le développement et les tests.

## 🛠️ Accès Infrastructure

| Service | URL | Login | Mot de Passe |
| :--- | :--- | :--- | :--- |
| **Application (Front)** | [http://localhost:3005](http://localhost:3005) | *(Login Keycloak)* | *(Login Keycloak)* |
| **Keycloak (Admin)** | [http://localhost:8180](http://localhost:8180) | `admin` | `admin123` |
| **Grafana** | [http://localhost:3000](http://localhost:3000) | `admin` | `admin123` |
| **Kafka UI** | [http://localhost:8090](http://localhost:8090) | *(aucun)* | *(aucun)* |
| **Postgres** | Port 5432-5437 | `sgfv` | `sgfv_secret` |

## 👤 Utilisateurs Application (SGFV)

Le mot de passe par défaut pour la plupart des comptes utilisateurs est : **`sgfv2026`**

| Login (Username) | Rôle / Profil | Mot de passe |
| :--- | :--- | :--- |
| **`admin`** | Administrateur Système | `admin123` |
| **`mail@gmail.com`** | Conducteur (Amel Ouachour) | `sgfv2026` |
| **`tech@gmail.com`** | Technicien (Maintenance) | `sgfv2026` |
| **`john`** | Utilisateur Standard | `sgfv2026` |
| **`test@gmail.com`** | Conducteur (Test) | `sgfv2026` |
| **`testt@gmail.com`** | Conducteur (Test) | `123456` |

---

### 💡 Comment réinitialiser un mot de passe ?
Si un compte est bloqué ou si vous voulez changer un mot de passe :
1. Connectez-vous sur **Keycloak** ([http://localhost:8180](http://localhost:8180)) en tant qu'admin.
2. Allez dans le menu **Users**.
3. Recherchez l'utilisateur et cliquez dessus.
4. Allez dans l'onglet **Credentials**.
5. Cliquez sur **Reset Password**.
6. Désactivez "Temporary" si vous ne voulez pas être obligé de le changer à la prochaine connexion.
