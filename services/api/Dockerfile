# Mulaqat API — NestJS on Node 22. Build context = repo root (monorepo).
FROM node:22-alpine AS base
# openssl: required for Prisma's engine detection on musl (else it falls back to openssl-1.1)
RUN apk add --no-cache openssl && corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /app
ENV CI=true

# Workspace with deps + generated prisma client
FROM base AS workspace
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY services/api/package.json services/api/package.json
RUN pnpm install --frozen-lockfile --filter @mulaqat/api...
COPY services/api ./services/api
RUN pnpm --filter @mulaqat/api exec prisma generate

# Dev: hot-reload friendly (compose target)
FROM workspace AS dev
EXPOSE 4000
CMD ["pnpm", "--filter", "@mulaqat/api", "start:dev"]

FROM workspace AS build
RUN pnpm --filter @mulaqat/api build

# Prod runner — non-root; prisma engines come along via node_modules
FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app /app
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --retries=10 \
  CMD wget -qO- http://127.0.0.1:4000/health || exit 1
CMD ["node", "services/api/dist/main.js"]
