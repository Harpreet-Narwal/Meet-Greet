# Mulaqat web — Next.js 15 on Node 22. Build context = repo root (monorepo).
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 CI=true

FROM base AS workspace
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages ./packages
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @mulaqat/web...
COPY apps/web ./apps/web

# Dev: HMR via compose bind mount (compose target)
FROM workspace AS dev
EXPOSE 3000
CMD ["pnpm", "--filter", "@mulaqat/web", "dev"]

FROM workspace AS build
RUN pnpm --filter @mulaqat/web build

# Prod runner — standalone output, non-root
FROM node:22-alpine AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
