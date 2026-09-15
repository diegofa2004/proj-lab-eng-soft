# Frontend Next.js — multi-stage: development (hot-reload) e production (standalone).
# Uso:
#   docker build --target development -t pcs3443-frontend:dev ./frontend
#   docker build --target production  -t pcs3443-frontend:prod ./frontend
# Nota: em produção o frontend vai para a Vercel (ver /infra/README.md);
# a imagem production existe para preview local / self-host.
# (No dia a dia, use /infra/docker-compose.dev.yml e docker-compose.prod.yml)

FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM base AS build
ENV NODE_ENV=production DOCKER_BUILD=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS production
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=build /app/public ./public
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
ENV PORT=3000 HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]