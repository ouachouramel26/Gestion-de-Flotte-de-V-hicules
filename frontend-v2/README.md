# SGFV Frontend - Micro-Frontends 💻

L'interface utilisateur de SGFV est construite selon une architecture de **Micro-Frontends**, permettant une scalabilité et une isolation des modules.

## 🛠️ Stack Technologique
- **Framework** : React 18
- **Build Tool** : Vite
- **Orchestration** : Module Federation (Webpack/Vite plugins)
- **Cartographie** : Leaflet.js
- **State Management** : Apollo Client (GraphQL)

## 📁 Structure des Modules
- **`mf-shell`** : L'application hôte. Gère le layout global, l'authentification Keycloak et la navigation.
- **`mf-carte`** : Module spécialisé pour le tracking GPS temps réel, injecté dans le Shell.

## 🚀 Développement local
1. Installez les dépendances :
   ```bash
   npm install
   ```
2. Lancez le Shell :
   ```bash
   cd mf-shell && npm run dev
   ```
3. Lancez la Carte :
   ```bash
   cd mf-carte && npm run dev
   ```

Accès : [http://localhost:3005](http://localhost:3005)

## 🔐 Sécurité
Intégration native avec **Keycloak**. Le dashboard n'est accessible qu'aux utilisateurs authentifiés avec les rôles appropriés (`admin`, `manager`, `technician`).
