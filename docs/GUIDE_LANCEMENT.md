# Guide de Lancement SGFV 🚀

Ce document explique comment démarrer l'ensemble du système SGFV, que ce soit via **Docker Compose** (développement local rapide) ou via **Kubernetes** (simulation de production).

---

## 🐳 Option 1 : Docker Compose (Recommandé pour le Dev)

Cette méthode lance tous les services d'infrastructure et les microservices dans des conteneurs Docker.

### 1. Pré-requis
- Docker Desktop installé et démarré.

### 2. Lancement
Ouvrez un terminal à la racine du projet et lancez :
```bash
docker-compose up -d
```

### 3. Démarrer le Front-End (Vite)
Le front-end n'est pas inclus dans le compose pour permettre le Hot Reload. Lancez-le manuellement :
```bash
cd frontend-v2/mf-shell
npm install
npm run dev
```

### 4. Accès
- **Application** : [http://localhost:3005](http://localhost:3005)
- **Keycloak** : [http://localhost:8180](http://localhost:8180)
- **Grafana** : [http://localhost:3000](http://localhost:3000)

---

## ☸️ Option 2 : Kubernetes (Simulation Prod)

Utilisez cette méthode pour tester l'orchestration, les déploiements et les services K8s.

### 1. Pré-requis
- Minikube ou Docker Desktop (K8s activé).
- `kubectl` installé.

### 2. Lancement de l'infrastructure
Appliquez les manifestes dans l'ordre :
```bash
kubectl apply -f K8s/namespaces.yaml
kubectl apply -f K8s/
```

### 3. Accès via Port-Forward
Comme nous n'utilisons pas d'Ingress Controller externe en local, il faut rediriger les ports :

```bash
# API Gateway
kubectl port-forward -n sgfv deploy/api-gateway 4000:4000

# Keycloak
kubectl port-forward -n sgfv deploy/keycloak 8180:8080

# Grafana
kubectl port-forward -n sgfv deploy/grafana 3000:3000
```

### 4. Lancer le Front-End
Lancez le script helper ou utilisez npm :
```powershell
.\start-frontend.ps1
```
Ou manuellement :
```bash
cd frontend-v2/mf-shell
npm run dev
```


## ✅ Preuve de fonctionnement
Voici la page de connexion Keycloak obtenue en accédant à l'application :

![Page de connexion Keycloak](images/keycloak_login.png)

---

*Note: Pour plus de détails sur les comptes utilisateurs, consultez [COMPTES.md](COMPTES.md).*
