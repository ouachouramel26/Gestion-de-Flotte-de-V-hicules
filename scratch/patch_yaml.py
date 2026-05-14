import sys

def patch_deployment(filename):
    with open(filename, 'r') as f:
        lines = f.readlines()
    
    new_lines = []
    for line in lines:
        new_lines.append(line)
        # Injection pour service-vehicules
        if 'name: service-vehicules' in line and 'containerPort: 8081' not in line:
            pass 
        if 'image: gestion_vehicules-service-vehicules:latest' in line:
            # On cherche l'endroit après env: pour ajouter volumeMounts
            pass

    # Methode plus simple : On remplace les blocs entiers
    content = "".join(lines)
    
    # Patch service-vehicules
    old_vehicules = """          env:
            - name: SPRING_DATASOURCE_USERNAME"""
    new_vehicules = """          env:
            - name: JAVA_TOOL_OPTIONS
              value: "-javaagent:/otel/opentelemetry-javaagent.jar"
            - name: OTEL_TRACES_EXPORTER
              value: "otlp"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector:4317"
            - name: OTEL_SERVICE_NAME
              value: "service-vehicules"
            - name: OTEL_METRICS_EXPORTER
              value: "none"
            - name: SPRING_DATASOURCE_USERNAME"""
    
    content = content.replace(old_vehicules, new_vehicules)
    
    # Patch service-conducteurs
    old_conducteurs = """          env:
            - name: SPRING_DATASOURCE_USERNAME"""
    # Note: this will replace both. Since we want different OTEL_SERVICE_NAME, 
    # we need a more specific approach.
    
    with open(filename, 'w') as f:
        f.write(content)

# Je vais finalement utiliser une approche manuelle ligne par ligne via le script pour eviter les doublons
