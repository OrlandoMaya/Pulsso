# syntax=docker/dockerfile:1
# Se construye desde la raíz del repo (el lockfile de pnpm es compartido):
#   docker build -f frontend/Dockerfile -t pulsso-frontend .

FROM node:22-alpine AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @pulsso/frontend
COPY frontend/ frontend/
# Vacío = la app llama a /api en el mismo dominio (nginx lo reenvía al backend)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @pulsso/frontend build

FROM nginx:1.29-alpine AS runtime
# nginx reemplaza ${API_UPSTREAM} en la plantilla al arrancar
ENV API_UPSTREAM=http://backend:4000
COPY frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/frontend/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
