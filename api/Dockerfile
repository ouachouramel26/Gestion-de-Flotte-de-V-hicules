FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

FROM node:20-alpine

WORKDIR /app

RUN addgroup -S sgfv && adduser -S sgfv -G sgfv

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY --from=builder --chown=sgfv:sgfv /app/src ./src
COPY --from=builder --chown=sgfv:sgfv /app/graphQL ./graphQL

USER sgfv

EXPOSE 4000

CMD ["node", "src/index.js"]
