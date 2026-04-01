# ───────────────────────────────────────────────────
# ÉTAPE 1 — BUILD
# CORRECTION : Java 17 → 21
# ───────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Cache Maven : pom.xml copié en premier
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src
RUN mvn package -DskipTests -q

# ───────────────────────────────────────────────────
# ÉTAPE 2 — PRODUCTION
# ───────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# CORRECTION : fleet → sgfv
RUN addgroup -S sgfv && adduser -S sgfv -G sgfv

COPY --from=builder --chown=sgfv:sgfv /app/target/*.jar app.jar

USER sgfv

EXPOSE 8082

# AJOUT : flags JVM pour Kubernetes
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]