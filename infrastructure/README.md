# Stack d'Observabilité SGFV 📈

Le projet SGFV implémente les trois piliers de l'observabilité de manière standardisée avec **OpenTelemetry**.

## 🏗️ Composants

1. **OpenTelemetry Collector** :
   - Reçoit les traces et métriques de tous les microservices.
   - Exporte les données vers Jaeger (Traces) et Prometheus (Métriques).
   - Configuration : `infrastructure/otel/otel-collector-config.yaml`.

2. **Prometheus** :
   - Stocke les séries temporelles de performance (RED metrics : Rate, Errors, Duration).
   - Scrape les données depuis le Collector.

3. **Grafana** :
   - Visualisation via dashboards personnalisés.
   - Les dashboards (JSON) se trouvent dans `infrastructure/grafana/dashboards/`.

4. **Jaeger** :
   - Traçage distribué pour visualiser le cycle de vie d'une requête entre services.

## 🚀 Instrumentation des Services
- **Spring Boot** : Utilisation du SDK OpenTelemetry et de Micrometer.
- **Node.js** : Utilisation de `@opentelemetry/sdk-node`.

## 📊 Métriques Métier (Business Metrics)
Le système expose des métriques spécifiques :
- Nombre de véhicules actifs.
- Nombre d'alertes de maintenance en attente.
- Latence moyenne du tracking GPS.
