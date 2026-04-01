# ───────────────────────────────────────────────────
# ÉTAPE 1 — BUILD
# ───────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# On copie d'abord le pom.xml séparément
# Astuce cache : si le code change mais pas pom.xml,
# Docker réutilise le cache des dépendances Maven
COPY pom.xml .
RUN mvn dependency:go-offline -q

# On copie le code source et on compile
COPY src ./src
RUN mvn package -DskipTests -q

# ───────────────────────────────────────────────────
# ÉTAPE 2 — PRODUCTION
# Image légère avec uniquement le JRE
# ───────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# CORRECTION : fleet → sgfv (cohérent avec docker-compose et fichiers SQL)
RUN addgroup -S sgfv && adduser -S sgfv -G sgfv

# On copie uniquement le .jar depuis l'étape builder
COPY --from=builder --chown=sgfv:sgfv /app/target/*.jar app.jar

USER sgfv

EXPOSE 8081

# AJOUT : flags JVM pour respecter les limites mémoire Kubernetes
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]