# PowerSync — architecture & runbook

Concise operational guide for this repo's PowerSync setup. Detailed research and
vendor citations live in [`docs/powersync-current-practices.md`](./powersync-current-practices.md);
this file is the practical map.

## Architecture

PowerSync **Cloud** reads from the app's **Postgres** source database and streams rows
to clients over **Sync Streams** (config `edition: 3`). Client writes never go through
PowerSync: the local upload queue POSTs to **our backend** (`apps/server`), which applies
them **synchronously** to Postgres; PowerSync then replicates the resulting state back to
all clients (server-authoritative reconciliation).

```
client (PowerSync SDK + op-sqlite)
  ├── read path:  connect(connector) → fetchCredentials() → /powersync/credentials → JWKS JWT → Sync Streams
  ├── write path: uploadData() → POST /powersync/upload → powerSyncBackend.applyExerciseOperations() → Postgres
  └── preseed:    GET /powersync/seed → signed R2 URL → download/verify → local catalog.sqlite
```

| Piece | Where |
|---|---|
| Sync config (streams) | `powersync/sync-config.yaml` |
| Service config (source DB, auth) | `powersync/service.yaml`, `powersync/cli.yaml` |
| Auth (JWT/JWKS) | `packages/auth/src/index.ts` (better-auth `jwt()` plugin) |
| Upload endpoint | `apps/server/src/powersync.ts` + `powersync-contract.ts` (mounted by `index.ts`) |
| Upload apply logic | `packages/db/src/domains/exercises/powersync.ts` + `packages/db/src/index.ts` |
| Client connector/session | `apps/native/lib/powersync/{connector,session,database,preseed}.ts` |
| Object storage primitives | `packages/storage/src/index.ts` — S3-compatible client, file/JSON helpers, and signed download URLs |
| Seed publisher | `packages/db/src/seeding/powersync-seed.ts` |

## Postgres prerequisites (source DB)

PowerSync's replication role needs these (run once by a DBA, on the source DB):

```sql
CREATE ROLE powersync_role WITH LOGIN REPLICATION BYPASSRLS PASSWORD '...';
GRANT CONNECT, SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- Replicate ONLY the sync tables, not better-auth tables (PowerSync reads every
-- publication table regardless of streams; auth churn would replicate too):
CREATE PUBLICATION powersync FOR TABLE
  body_part, equipment, muscle, exercise,
  exercise_to_body_part, exercise_to_equipment, exercise_to_muscle;
```

The instance connects via `PS_DATABASE_URI` (`powersync/service.yaml`,
`replication.connections[0].uri`, `sslmode: verify-full` + CA cert for the
callus-db host). The Postgres server must have `wal_level = logical` set and be ≥ v11.
See `docs/powersync-current-practices.md` §1.1 for the official setup reference.

## Auth / JWKS

- The server mints short-lived RS256 JWTs via better-auth's `jwt()` plugin:
  `kid` = JWKS key, `aud` = `POWERSYNC_URL`, `exp - iat` = 5 minutes, `sub` = user id.
- Public JWKS is served at `/api/auth/jwks`; `client_auth.jwks_uri` in
  `powersync/service.yaml` points at `https://callus-api.lostsignal.cloud/api/auth/jwks`.
- Client token fetch: `connector.ts::fetchCredentials()` → `GET /powersync/credentials`
  (session cookie) → `{ endpoint, token }`; 401 → `null` (SDK retries on expiry/401).
- Key rotation: add the new key to the JWKS → wait ~5 min → sign with it → remove the
  old key after expiry (client TTLs < 30 s break the SDK's pre-fetch; keep 5 min).

## Sync Streams

`powersync/sync-config.yaml`, `config: edition: 3`:

- `exercise_catalog` (auto-subscribe): public catalog rows — `user_id IS NULL`.
- `user_exercises` (auto-subscribe): `user_id = auth.user_id()`.
- All client tables use text `id`s; join rows use deterministic concatenated ids
  `{exercise_id}:{lookup_id}`, enforced by DB check constraints.
- Exercise types: `bool → integer (0/1)`, timestamps/uuid → text (ISO-8601). Client
  schema mirrors this in `apps/native/features/exercises/schema.ts`.

Do not edit `service.yaml`/`cli.yaml` without explicit authorization (deployment
changes can break replication or take down prod). Stream edits are `sync-config.yaml`-only
and recoverable by re-deploy.

## Client lifecycle

- `connect()` once per session (fire-and-forget; `waitForFirstSync()` for readiness).
- `usePowerSyncSession(userId, offline)` (`session.ts`) serializes owner transitions:
  same user reconnecting → `disconnect()`; user switch/logout → `disconnectAndClear()`
  plus clearing the locally stored owner id (`callus-powersync-owner`; SecureStore on
  native, `localStorage` on web). Offline mode keeps the current owner.
- `initializePowerSyncDatabase()` is concurrency-safe (one in-flight init), inserts a
  fresh random `client_id` into `ps_kv` when missing, and must be re-run after
  `setPowerSyncDatabase()`.

## Upload contract (`POST /powersync/upload`)

| Case | HTTP | Body | Client effect |
|---|---|---|---|
| Applied | 200 | `{ ok: true, rejected: [] }` | `transaction.complete()` — queue advances |
| Intentional rejection (validation) | 200 | `{ ok: true, rejected: [ids], error }` | queue advances; server state reconciles; connector logs rejections |
| Malformed / oversized payload | 503 | `{ ok: false, error }` | connector throws → SDK retries with backoff |
| Database failure | 503 | `{ ok: false, error }` | same (transient) |
| Auth failure | 200 | `{ ok: false, error }` | connector throws and retries (never a 4xx, which would **block the queue permanently**) |

`parseUploadPayload` (`apps/server/src/powersync-contract.ts`) bounds the body at
64 KB and validates the zod allowlist before any DB work; malformed payloads are
**never acknowledged as success**. `applyExerciseOperations` (`packages/db/...`) runs
the whole batch in one Postgres transaction; relationship `DELETE`s are allowed when
the parent exercise is deleted in the same transaction (PUT/PATCH on a deleted parent
is rejected).

Client ops: exercise table ops (PUT/PATCH/DELETE) + link-table ops
(`exercise_to_body_part`, `exercise_to_equipment`, `exercise_to_muscle`),
tags `PUT`/`PATCH`/`DELETE`, booleans as 0/1.

## Preseed flow

1. **Publish** — `powersync:seed:publish` (`@callus/db`): Node SDK connects to the
   catalog stream, asserts the catalog counts and that no user-owned rows exist,
   deletes `ps_kv client_id`, `VACUUM INTO` a portable sqlite, and uses
   `@callus/storage` to upload
   `{env}/{version}.sqlite` to R2 plus `{env}/latest.json` (sha256 + size + counts +
   schemaVersion). Versions are `${Date.now()}-${sha-prefix}`; publishing refuses to
   overwrite a newer `latest.json`.
2. **Serve** — `GET /powersync/seed` (`apps/server/src/powersync-r2.ts`): session-gated,
   validates the manifest, and uses `@callus/storage` to return a 5-min signed R2 URL.
3. **Client** — `preseed.ts`: downloads, verifies size/sha256/counts, opens a throwaway
   `PowerSyncDatabase` to verify the catalog, strips `client_id`, then moves the file
   into place. Any preseed failure falls back to an empty local database (first sync
   then populates it). Web skips preseed.

Seed publishes need `POWERSYNC_DEVELOPMENT_TOKEN` (12 h expiry, requires the instance's
Development-tokens toggle) — regenerate as part of a documented seed run.

## Environment variables

| Var | Where | Notes |
|---|---|---|
| `POWERSYNC_URL` | server, seed | instance/public endpoint, also JWT `aud` |
| `PS_DATABASE_URI` / `PS_DATABASE_CA_CERT` | server, service.yaml | Cloud source-DB connection |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | server, seed | preseed storage |
| `R2_BUCKET` | server, seed | default `callus` |
| `POWERSYNC_SEED_ENV` | server, seed | `development` \| `staging` \| `production` (object-key prefix) |
| `POWERSYNC_DEVELOPMENT_TOKEN` | seed | temporary token (12 h) |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `CORS_ORIGIN` / `DATABASE_URL` / `PORT` | server | standard |

`.env.example` (repo root and `apps/server/.env.example`) document the full set.

## Schema-change checklist

A schema change must land in lockstep across all four places (Postgres DDL is **not**
replicated automatically; unaffected columns/tables are stored but inaccessible):

1. `packages/db/src/domains/exercises/schema.ts` + drizzle migration, then `db:migrate:deploy`.
2. `powersync/sync-config.yaml` — the stream queries must `SELECT` new columns.
3. `apps/native/features/exercises/schema.ts` — client view (ships with the app
   release; no client-side migration).
4. Re-publish the seed: `powersync deploy sync-config` → `powersync:seed:publish`.

Caveats: adding columns with a NULL default is safe; column drops/renames need every row
touched (or `TRUNCATE` before `DROP`); adding large tables / replica-identity changes
re-replicate the whole table; publication-membership edits only pick up as **new** tables;
versioned streams only when old client builds must stay on the previous schema.
See `docs/powersync-current-practices.md` §1.6.

## Validation & testing

- `pnpm check-types` — repo-wide type check.
- `pnpm --filter server test` — upload-contract tests (allowlist + `parseUploadPayload`
  transient-failure behavior).
- `pnpm db:seed:exercises:test` — catalog-count assertions against the JSON seed.
- `pnpm lint && pnpm format:check` — oxlint + oxfmt.
- No DB-backed unit harness for `applyExerciseOperations` exists; verify DELETE-in-tx
  behavior manually against a dev DB (see below).

## Deployment verification

1. `powersync fetch instances` — instance up; Cloud dashboard live-log filter
   `error:PSYNC_`, `lag:>=5` on Replicator logs to spot replication drift.
2. Login in the app → expect the catalog to appear (from preseed or first sync) and the
   `user_exercises` stream to carry a new custom exercise.
3. Create/edit/delete a custom exercise offline, reconnect → verify it lands in Postgres
   (`SELECT ... FROM exercise WHERE user_id IS NOT NULL`) and that link rows are deleted
   with the exercise.
4. Send an oversized/malformed `POST /powersync/upload` (curl) → expect 503 `ok:false`;
   the app's upload queue must keep and retry the transaction, not drop it.
5. Seed: run `powersync:seed:publish` twice — the second run must refuse to overwrite a
   newer `latest.json`.
6. Issue alerts (DB connection, replication — Fatal) + notification rules (email/webhook,
   verify `x-journey-signature` HMAC for webhooks) per `docs/powersync-current-practices.md` §3.6.

## Known operational limitations

- `latest.json` overwrite guard is by embedded timestamp; two concurrent publishes with
  skewed clocks could still race (no conditional-put with ETag). Publish from one host.
- The source publication must list only the sync tables; remember new tables there and in
  `sync-config.yaml` (filter changes silently drop changes for existing rows).
- Development tokens expire after 12 h and require the instance toggle; the seed pipeline
  depends on them.
