# syntax=docker/dockerfile:1
# Se construye desde la raíz del repo (el lockfile de pnpm es compartido):
#   docker build -f backend/Dockerfile -t pulsso-backend .

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
# Solo los manifiestos: la capa de dependencias se reutiliza mientras no cambien
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

# --- Compilación (con dependencias de desarrollo) ---
FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @pulsso/backend
COPY backend/ backend/
RUN pnpm --filter @pulsso/backend build

# --- Solo dependencias de producción ---
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @pulsso/backend

# --- Imagen final ---
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /repo/backend
COPY --from=prod-deps --chown=node:node /repo/node_modules /repo/node_modules
COPY --from=prod-deps --chown=node:node /repo/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/backend/package.json ./
COPY --from=build --chown=node:node /repo/backend/dist ./dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
# MONGODB_URI y JWT_SECRET llegan como variables de entorno, nunca dentro de la imagen
CMD ["node", "dist/main"]
