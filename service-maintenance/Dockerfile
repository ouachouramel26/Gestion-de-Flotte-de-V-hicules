# ───────────────────────────────────────────────────
# ÉTAPE 1 — BUILD
# CORRECTION : Java 17 → 21
# ───────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Cache Maven : pom.xml copié en premier
# Si le code change mais pas pom.xml → dépendances réutilisées depuis le cache
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn package -DskipTests -q

# ───────────────────────────────────────────────────
# ÉTAPE 2 — PRODUCTION
# Image légère JRE uniquement
# ───────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# CORRECTION : fleet → sgfv (cohérent avec docker-compose et SQL)
RUN addgroup -S sgfv && adduser -S sgfv -G sgfv

COPY --from=builder --chown=sgfv:sgfv /app/target/*.jar app.jar

USER sgfv

EXPOSE 8083

# AJOUT : flags JVM pour respecter les limites mémoire Kubernetes
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]