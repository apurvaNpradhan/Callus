FROM node:22-alpine AS build

RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/server/package.json apps/server/tsconfig.json apps/server/tsdown.config.ts apps/server/
COPY apps/server/src apps/server/src
COPY packages packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter server build

FROM node:22-alpine AS runtime
WORKDIR /app/apps/server
ENV NODE_ENV=production

COPY --from=build /app/apps/server/dist ./dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/server/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/index.mjs"]

# Used by the one-shot migration service in compose.dokploy.yml.
FROM build AS migrate
WORKDIR /app/packages/db
CMD ["pnpm", "db:migrate:deploy"]
