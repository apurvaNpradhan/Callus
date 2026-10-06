# Environment variables

## Validation and scope

All application variables are validated at import time by Zod in `packages/env/src/`.

| Config | Scope |
| --- | --- |
| `ENV_SERVER` | API server only (`apps/server`) |
| `ENV_WEB_ISOMORPHIC` | Web client and server (`apps/web`) |
| `ENV_WEB_SERVER` | Web server only |

Only variables with the `VITE_` prefix are exposed to the web client. Keep `DATABASE_URL` and `BETTER_AUTH_SECRET` server-only.

## Updating configuration

When adding or changing an environment variable, update the places that actually consume it:

1. Add Zod validation to the correct object under `packages/env/src/`.
2. Set local development values in `packages/env/.env.example`.
3. Add runtime values to the relevant service under `environment` in `docker-compose.yaml` and `docker-compose.dokploy.yaml`.
4. Add build-time public configuration to the relevant Dockerfile `ARG`/builder `ENV` and Compose `build.args` only when the build consumes it.
5. Add it to `apps/web/vite.config.ts` task cache inputs when it affects the web build.
6. Update test fixtures and app-specific examples such as `apps/native/.env.example` when that app reads it.

Remove stale examples when a variable stops being read. Do not keep env-variable documentation that merely repeats a Zod default or an unused template.

## Dokploy Compose

`docker-compose.dokploy.yaml` is the production deployment Compose file. Configure its required variables in Dokploy's Compose environment editor. Dokploy writes them to `.env`, but Compose does not automatically inject those values into containers. Keep the file's `${VARIABLE}` references under each service's `environment` explicit.

Set `VITE_SERVER_URL` and `VITE_WEB_URL` to the public API and web URLs used by Better Auth, including any configured base path. Set `DATABASE_URL` to the internal Compose hostname `postgres`, not a public database address. Match its credentials and database name to `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`. Configure `BETTER_AUTH_SECRET` as a deployment secret. Configure Dokploy Domains to route the API service to port `3000` and the web service to port `3001`; both services join `dokploy-network` and use `expose` rather than publishing ports on the host.

`DATABASE_URL` and `BETTER_AUTH_SECRET` are injected at runtime only. Docker builder stages use disposable build-only values to satisfy import-time env validation; never pass production credentials as Docker build arguments. `SOURCE_COMMIT` is optional and defaults to `unknown`.

## Gotchas

- Use `z.stringbool()` for boolean environment variables.
- `DATABASE_URL` and `BETTER_AUTH_SECRET` must be set for running the API, web server, and migration service.
- Keep development defaults aligned between `packages/env/.env.example` and `docker-compose.yaml`.
- When a web build uses an environment value, declare it in the Vite+ task cache inputs so cached output cannot hide a changed build setting.
