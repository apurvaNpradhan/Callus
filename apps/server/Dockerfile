FROM ghcr.io/voidzero-dev/vite-plus:1.0.0 AS installer

WORKDIR /app

COPY --chown=vp:vp --parents **/package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./

RUN vp install --frozen-lockfile --ignore-scripts

FROM installer AS migrator

COPY --chown=vp:vp . .

CMD ["vp", "run", "db:migrate"]

FROM installer AS builder

COPY --chown=vp:vp . .

RUN mkdir -p packages/db/migrations

ARG SOURCE_COMMIT VITE_SERVER_URL VITE_WEB_URL
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    VITE_SERVER_URL=${VITE_SERVER_URL} \
    VITE_WEB_URL=${VITE_WEB_URL} \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/callus \
    BETTER_AUTH_SECRET=build-only-not-a-production-secret-0000000000

RUN vp run test:unit:run

RUN vp run -v --filter server build
RUN cp "$(vp env which node | sed -n '1p')" /tmp/node

FROM debian:bookworm-slim AS production

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates libatomic1 \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" server

COPY --from=builder /tmp/node /usr/local/bin/node
COPY --from=builder --chown=server:nodejs /app/apps/server/.output /app/.output
COPY --from=builder --chown=server:nodejs /app/packages/db/migrations /app/.output/migrations

USER server

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}$(echo ${VITE_SERVER_URL} | sed 's|^http[s]*://[^/]*||' | sed 's|/$||')/health/live || exit 1

CMD ["node", "/app/.output/index.mjs", "--hostname", "0.0.0.0"]
