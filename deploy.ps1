# ============================================================
# SGFV - Script de déploiement complet (PowerShell)
# Exécuter depuis : C:\Users\hp\Desktop\sgfv\gestion-vehicules
# ============================================================

# 1. Build des images Docker (en utilisant le cache pour éviter les timeouts réseau)
docker compose build

# 2. Lancer tous les conteneurs locaux
docker compose up -d

# 2b. Tagger les images pour Kubernetes (résout le décalage de nommage '-' vs '_')
docker tag gestion-vehicules-service-vehicules:latest gestion_vehicules-service-vehicules:latest
docker tag gestion-vehicules-service-conducteurs:latest gestion_vehicules-service-conducteurs:latest
docker tag gestion-vehicules-service-maintenance:latest gestion_vehicules-service-maintenance:latest
docker tag gestion-vehicules-service-alertes:latest gestion_vehicules-service-alertes:latest
docker tag gestion-vehicules-service-localisation:latest gestion_vehicules-service-localisation:latest
docker tag gestion-vehicules-api-gateway:latest gestion_vehicules-api-gateway:latest

# 3. Créer le namespace Kubernetes
kubectl create namespace sgfv

# 4. Ajouter les repos Helm
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo add timescale https://charts.timescale.com/

# 5. Mettre à jour les repos
helm repo update

# 6. Installer PostgreSQL pour chaque service
helm upgrade --install postgres-vehicules bitnami/postgresql `
  --namespace sgfv `
  --set auth.username=sgfv `
  --set auth.password=sgfv_secret `
  --set auth.database=vehicules_db

helm upgrade --install postgres-conducteurs bitnami/postgresql `
  --namespace sgfv `
  --set auth.username=sgfv `
  --set auth.password=sgfv_secret `
  --set auth.database=conducteurs_db

helm upgrade --install postgres-maintenance bitnami/postgresql `
  --namespace sgfv `
  --set auth.username=sgfv `
  --set auth.password=sgfv_secret `
  --set auth.database=maintenance_db

helm upgrade --install postgres-alertes bitnami/postgresql `
  --namespace sgfv `
  --set auth.username=sgfv `
  --set auth.password=sgfv_secret `
  --set auth.database=alertes_db

# 7. Installer TimescaleDB pour la localisation
# Note : la désinstallation puis réinstallation propre est requise si le certificat TLS manque
helm upgrade --install postgres-localisation timescale/timescaledb-single `
  --namespace sgfv `
  --set replicaCount=1 `
  --set image.tag=pg15-ts2.26-oss

# 8. Monitoring : Prometheus
helm upgrade --install prometheus prometheus-community/prometheus `
  --namespace sgfv `
  --set server.persistentVolume.enabled=false `
  --set alertmanager.enabled=false

# 9. Monitoring : Grafana
helm upgrade --install grafana grafana/grafana `
  --namespace sgfv `
  --set adminPassword=admin123 `
  --set persistence.enabled=false

# 10. Logs : Loki (utilisation de loki-stack plus adapté au dev monopode local)
helm upgrade --install loki grafana/loki-stack `
  --namespace sgfv `
  --set loki.persistence.enabled=false

# 11. Tracing : Jaeger
helm upgrade --install jaeger jaegertracing/jaeger `
  --namespace sgfv `
  --set allInOne.enabled=true

# 12. Appliquer les manifests Kubernetes (contient aussi l'OTel Collector)
kubectl apply -f K8s/
