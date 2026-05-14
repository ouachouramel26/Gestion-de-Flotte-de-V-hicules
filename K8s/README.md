# Déploiement Kubernetes SGFV ☸️

Ce dossier contient tous les manifestes nécessaires pour déployer la plateforme SGFV sur un cluster Kubernetes (Minikube, K3s, Docker Desktop).

## 🚀 Ordre de déploiement Recommandé

Il est important de respecter l'ordre pour que les dépendances (Bases de données, Kafka) soient prêtes avant les services.

### 1. Fondations
```bash
kubectl apply -f namespaces.yaml
kubectl apply -f storage.yaml   # PVCs pour Postgres et Kafka
kubectl apply -f secrets.yaml   # Mots de passe et clés
kubectl apply -f configmaps.yaml # Configuration des URLs
```

### 2. Infrastructure (Bases, Kafka, Auth)
```bash
kubectl apply -f kafka.yaml
kubectl apply -f keycloak.yaml
```

### 3. Microservices & API
```bash
kubectl apply -f services.yaml
kubectl apply -f deployments.yaml
```

### 4. Observabilité (OTel, Prometheus, Grafana)
```bash
kubectl apply -f otel-collector-deploy.yaml
kubectl apply -f grafana-provisioning.yaml
```

## 🛠️ Accès aux services en local
Sans Ingress Controller externe, utilisez `port-forward` :
- `kubectl port-forward -n sgfv deploy/api-gateway 4000:4000`
- `kubectl port-forward -n sgfv deploy/keycloak 8180:8080`
- `kubectl port-forward -n sgfv deploy/grafana 3000:3000`

## 📊 Monitoring
Les métriques sont automatiquement collectées par l'OpenTelemetry Collector et envoyées à Prometheus. Grafana est pré-configuré pour lire ces données.
