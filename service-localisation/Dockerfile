# ───────────────────────────────────────────────────
# ÉTAPE 1 — BUILD
# Node.js pur Express — pas de compilation TypeScript
# ───────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# ───────────────────────────────────────────────────
# ÉTAPE 2 — PRODUCTION
# ───────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

RUN addgroup -S sgfv && adduser -S sgfv -G sgfv

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder --chown=sgfv:sgfv /app/src ./src

USER sgfv

EXPOSE 8084
EXPOSE 3001

CMD ["node", "src/app.js"]