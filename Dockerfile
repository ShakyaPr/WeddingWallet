# syntax=docker/dockerfile:1
# WeddingWallet — one container serving the React SPA + the Node API.
# Dokploy: Build Type = Dockerfile, Dockerfile Path = Dockerfile, Docker Context Path = .

# ---- 1. Build: compile the SPA (dist/) and the server (dist-server/) --------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- 2. Runtime: production deps + compiled output only ---------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY db ./db

USER node
EXPOSE 3000

# Used by Docker Swarm (which Dokploy runs on) to know when a new container is
# ready — gives zero-downtime redeploys. Fails if the app or the DB is down.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

CMD ["node", "dist-server/index.js"]
