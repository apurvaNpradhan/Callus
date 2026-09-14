# PowerSync Current Practices — Research Report

**Scope:** Cloud + Postgres + custom backend, Sync Streams, custom JWT/JWKS, `uploadData`, React Native/Expo, schema/migrations, and operational verification.

**Method:** Facts below are taken from the official docs index (`https://docs.powersync.com/llms.txt`, fetched 2026-09-14) and the linked first-party pages cited inline. The vendored skill at `.agents/skills/powersync/` (SKILL.md, AGENTS.md, `references/onboarding-custom.md`, `references/custom-backend.md`, `references/sync-config.md`, `references/sdks/powersync-js-react-native.md`) was used as the review rubric; official docs were used as the source of truth wherever the two differ. Repo artifacts are cited by path.

---

## 1. Verified current guidance by focus area

### 1.1 Cloud + Postgres + custom backend

- Postgres must be ≥ v11 and have **logical replication enabled** (`wal_level = logical`, restart required). A **dedicated role** (e.g. `powersync_role` with `REPLICATION BYPASSRLS LOGIN`, `GRANT SELECT`, plus `ALTER DEFAULT PRIVILEGES ... GRANT SELECT ON TABLES` for future tables) and a **publication named `powersync`** are required. `CREATE PUBLICATION powersync FOR ALL TABLES` is the dev default; for large volumes, list only the tables to replicate, because **PowerSync reads every update in the publication regardless of whether the table appears in Sync Streams**.
  - https://docs.powersync.com/configuration/source-db/setup.md
- The write path never goes through the PowerSync Service: the client upload queue posts to **your backend API**, which must apply operations **synchronously** to the source database; PowerSync then replicates the resulting state back to all clients ("server-authoritative reconciliation"). Conflict resolution is entirely backend-owned (plain `INSERT ... ON CONFLICT DO UPDATE` / `UPDATE` = per-field last-write-wins).
  - https://docs.powersync.com/configuration/app-backend/setup.md, https://docs.powersync.com/configuration/app-backend/client-side-integration.md
- Cloud `service.yaml` configures the source connection via `replication.connections` (`!env` secrets), `region` (fixed after creation), and `client_auth`. Self-hosted vs Cloud templates differ; `PS_DATABASE_URI` is the Cloud variable name.
  - https://docs.powersync.com/configuration/powersync-service/self-hosted-instances.md, https://docs.powersync.com/configuration/powersync-service/cloud-instances.md

### 1.2 Sync Streams

- **Sync Streams are the recommended (current) sync config; Sync Rules are legacy.** The config must open with `config: edition: 3`. Streams define SQL-like queries; values come from auth (signed JWT) parameters — `auth.user_id()` / `auth.jwt()` — subscription parameters (`subscription.parameter(...)`, requires an auth guard + `accept_potentially_dangerous_queries`), or connection parameters. `auto_subscribe: true` is appropriate for global/reference data and always-synced personal data; it must **not** be used with `subscription.parameter()` streams.
  - https://docs.powersync.com/sync/streams/overview.md, https://docs.powersync.com/sync/streams/parameters.md
- Each `(stream, parameter values)` combination is one bucket; per-user limits default to **1,000 unique buckets and 1,000 parameter lookup rows** (exceeding → `PSYNC_S2305`). Use multiple `queries:` in one stream instead of many streams.
  - https://docs.powersync.com/sync/streams/bucket-count.md
- Every client table needs a single **text-type `id` primary key**. For join tables without a natural single key, PowerSync supports concatenated deterministic ids (`item_id || '.' || category_id AS id`); the source DB should enforce uniqueness (unique index / check constraint). Client-generated ids for new rows should be UUIDs.
  - https://docs.powersync.com/sync/advanced/client-id.md
- Service v1.24.0+ adds wildcard schemas (`"%"`, `schema()`, `table_name()`, `table_suffix()`) — not needed for single-schema apps. Prioritized sync (0–3, lower = first) and TTLs (default 24 h after unsubscribe) are available per stream/subscription. Sync Streams require the SDK's Rust sync client (default in recent SDK releases).
  - https://docs.powersync.com/sync/advanced/overview.md, https://docs.powersync.com/sync/streams/client-usage.md

### 1.3 Custom JWT / JWKS

- Required JWT properties: signed by a key in the JWKS (asymmetric: RS256/384/512, ES*, EdDSA — recommended; HS256 = dev only); `kid` matching the JWKS key; `aud` matching the instance URL (Cloud) or configured audience; `iat` + `exp` with `exp - iat ≤ 86,400` s (24 h), **5–60 minutes recommended**; `sub` = user id. JWKS can be served from a public URL (`jwks_uri`, refreshed every few minutes; rotation = add key → wait ~5 min → sign new → remove old after expiry) or configured inline.
  - https://docs.powersync.com/configuration/auth/custom.md
- Development tokens (dashboard "Development tokens" toggle or CLI `powersync generate token`) expire after **12 hours** and are for testing/debugging only.
  - https://docs.powersync.com/configuration/auth/development-tokens.md
- The client fetches the token via `fetchCredentials()`; the SDK caches it, pre-fetches when ≤ 30 s remain, and refetches on 401/expiry. TTLs under 30 s break pre-fetching.
  - https://docs.powersync.com/configuration/app-backend/client-side-integration.md

### 1.4 uploadData / write path

- `uploadData()` is called automatically (after local writes, on (re)connect, on ~20 s keepalives, and on retry with ~5 s backoff). Each call processes **one** transaction; callers must `await transaction.complete()` or the queue stalls forever (the SDK explicitly detects the stall and logs/retries).
- **Backend response contract:** 2xx → queue advances (`complete()`); validation/write-conflict errors must still return **2xx with error details in the body** (client rolls the change back once the queue is empty and the server state is authoritative); 5xx → SDK retries with backoff; **4xx for data errors blocks the queue permanently**. The recommended way to surface validation failures to the end user is error details in the 2xx body (asynchronously propagated) or a synced error table.
  - https://docs.powersync.com/configuration/app-backend/client-side-integration.md, https://docs.powersync.com/handling-writes/handling-write-validation-errors.md
- Upload payloads are tagged `PUT` (insert/replace), `PATCH` (changed columns only), `DELETE`. Booleans arrive as integers (0/1). Backends must scope/allowlist tables and validate input (the official example helpfully interpolates table names — production must not).
  - https://docs.powersync.com/handling-writes/writing-client-changes.md

### 1.5 React Native / Expo

- Standard setup: `@powersync/react-native` + `@op-engineering/op-sqlite` (native adapter, requires a dev build — **not** Expo Go). Expo Go requires the alpha `@powersync/adapter-sql-js` (in-memory, no consistency guarantees; not for production). Expo 49–51 need `minSdkVersion: 24` via `expo-build-properties`; 52+ configure automatically. `PowerSyncContext.Provider` + hooks (`useQuery`, `useStatus`, `useSuspenseQuery`).
  - https://docs.powersync.com/client-sdks/reference/react-native-and-expo.md, https://docs.powersync.com/client-sdks/frameworks/expo-go-support.md
- `connect()` is fire-and-forget (use `waitForFirstSync()` for readiness); call it once per session, not on focus/token refresh. On logout/user-switch use `disconnectAndClear()`; for the same user returning use `disconnect()`.
  - `.agents/skills/powersync/SKILL.md`, https://docs.powersync.com/architecture/client-architecture.md
- **Pre-seeding** is the supported way to skip the initial sync: run the PowerSync **Node SDK** server-side, `waitForFirstSync()`, `DELETE FROM ps_kv WHERE key = 'client_id'`, `VACUUM INTO` a portable file, upload to blob storage with version/checksum metadata; clients download, then **insert a fresh `client_id` into `ps_kv` before connecting**. The `client_id` identifies the device and must not be shipped in snapshots.
  - https://docs.powersync.com/client-sdks/advanced/pre-seeded-sqlite.md

### 1.6 Schema / migrations

- The PowerSync protocol is **schemaless**: the client schema is only a local view. Client schema updates take effect when the new app runs — no client-side migration. Columns/tables absent from the client schema are stored but inaccessible; type mismatches are handled with SQLite `CAST`.
- **Postgres DDL is not replicated.** Adding columns (NULL default) is safe; defaults for existing rows, column drops/renames/type changes require touching every row. Replica-identity changes and large table adds re-replicate the whole table (and block other replication while doing so). DROP = `TRUNCATE` first or remove from streams. Publication membership changes (add table / row filters) are only picked up as new tables; filters can silently drop changes. Streams affected by schema changes fail "soft" (alert generated, replication continues).
- **Deploying schema changes** (Postgres) therefore means: apply DDL if needed → ensure table is in the publication → deploy updated Sync Config (new columns must appear in stream queries to sync) → update client schema in the app release; keep older app versions working via versioned streams or connection parameters (multiple client versions).
  - https://docs.powersync.com/maintenance-ops/implementing-schema-changes.md, https://docs.powersync.com/maintenance-ops/deploying-schema-changes.md
- Type mapping is on the client: `timestamptz`/`date`/`uuid`/`enum`/`jsonb` → `text` (ISO-8601 strings), `bool` → `integer` (0/1), `int*` → `integer`, `float*` → `real`, `numeric` → `text`.
  - https://docs.powersync.com/sync/types.md

### 1.7 Operational verification

- Cloud dashboard: **Usage metrics** (storage, concurrent clients, synced/replicated data & ops), **Instance logs** with log-type selection (Sync & API, Replicator, Compact, Migration), free-text + `alias:value` filtering (`user_id:`, `client_id:`, `rid:`, `error:PSYNC_S2xxx`, `close_reason:`, `lag:>=5`), CSV export. Log retention: Free 24 h / Pro 7 d / Team+ 30 d.
- **Issue alerts** (database connection, replication; Warning/Fatal) are available on all Cloud plans; **usage alerts** on Team/Enterprise. Alert delivery needs explicit **notification rules**: email rules and/or webhooks (webhook deliveries signed with `x-journey-signature` = base64 HMAC-SHA256 of the body with the per-webhook secret; verify server-side). Deploy state changes (start/complete/fail) can also notify.
  - https://docs.powersync.com/maintenance-ops/monitoring-and-alerting.md, https://docs.powersync.com/debugging/log-reference.md, https://docs.powersync.com/debugging/error-codes.md
- Other first-party verification tools: the **Sync Diagnostics Client** (standalone app to test Sync Streams with a dev token), **Troubleshooting** guide, replication-lag guide, and the Cloud instance status via the CLI (`powersync fetch instances`).
  - https://docs.powersync.com/tools/diagnostics-client.md, https://docs.powersync.com/maintenance-ops/replication-lag.md, https://docs.powersync.com/tools/cli.md

---

## 2. This repo's implementation (artifact map)

| Area | Repo artifact | Matches guidance? |
|---|---|---|
| Cloud instance | `powersync/cli.yaml` (type: cloud, instance `6aa66e9c02481fb31b962287`) | ✓ |
| Postgres connection | `powersync/service.yaml` — `replication.connections` postgresql, `PS_DATABASE_URI` (dedicated `powersync_role` user), `sslmode: verify-full`, CA cert via `!env` | ✓ (dedicated user, TLS) |
| Client auth | `powersync/service.yaml` — `client_auth.jwks_uri: https://callus-api.lostsignal.cloud/api/auth/jwks`; `packages/auth/src/index.ts` — better-auth `jwt()` plugin, RS256, JWKS at `/api/auth/jwks`, `audience: POWERSYNC_URL`, `expirationTime: "5 minutes"` | ✓ (asymmetric, ≤60 min, aud = instance URL) |
| Sync Streams | `powersync/sync-config.yaml` — `config: edition: 3`; streams `exercise_catalog` + `user_exercises`, `auto_subscribe: true`, `auth.user_id()` filters; join-table ids `{exercise_id}:{lookup_id}` enforced by DB check constraints | ✓ (edition 3, no client params → auto-subscribe safe) |
| fetchCredentials | `apps/native/lib/powersync/connector.ts` → `GET /powersync/credentials` (`apps/server/src/index.ts`) — session check, better-auth JWT, returns `{endpoint, token}`; 401 → null | ✓ |
| uploadData | `connector.ts` → `POST /powersync/upload` (`apps/server/src/powersync.ts` + `powersync-contract.ts` zod allowlist + `packages/db/src/domains/exercises/powersync.ts` inside one `db.transaction`); `transaction.complete()` on 2xx; 5xx for transient/malformed | ✓ |
| RN/Expo SDK | `apps/native/package.json` — `@powersync/react-native ^2.2.1`, `@op-engineering/op-sqlite`; `PowerSyncContext.Provider` in `app/_layout.tsx`; `session.ts` — connect once, `disconnect()` offline vs `disconnectAndClear()` on user switch | ✓ (native adapter; requires dev build, consistent with docs) |
| Pre-seeding | `packages/db/src/seeding/powersync-seed.ts` (Node SDK, `waitForFirstSync`, catalog count assert, `DELETE ps_kv client_id`, `VACUUM INTO`, `@callus/storage` R2 + sha256 manifest) ↔ `apps/native/lib/powersync/preseed.ts` (download, size/checksum/count verify, fresh `client_id` on init in `database.ts`) → served via `GET /powersync/seed` (`powersync-r2.ts`, also using `@callus/storage`) | ✓ closely follows the official pattern |
| Schema/types | `packages/db/src/domains/exercises/schema.ts` + drizzle migrations; client `apps/native/features/exercises/schema.ts` (timestamps as `text`, `is_primary` integer-boolean) | ✓ type mapping correct |
| Seed schema | `powersync-seed.ts` `new Schema(...)` — mirror of client tables | ✓ |

---

## 3. Applied to this repo — gaps & recommended changes

The findings below are remaining follow-up items; the shared storage boundary is
implemented in `packages/storage`.

### 3.1 Source-DB replication setup is not documented or scripted in-repo
The docs require `wal_level = logical`, the `powersync` publication, and a `powersync_role` with `REPLICATION BYPASSRLS`, `GRANT SELECT`, and `ALTER DEFAULT PRIVILEGES` before any sync works (Cloud Readiness Gate in `.agents/skills/powersync/AGENTS.md`). The procedure is documented in `docs/powersync.md`, but no executable setup SQL is committed; `compose.local.yml` is a stock Postgres. The instance reads from `callus-db.lostsignal.cloud:5550`.
- **Recommended:** add a `docs/powersync-postgres-setup.sql` (or a migration-less `docs/` procedure) mirroring https://docs.powersync.com/configuration/source-db/setup.md — role + grants + default privileges + `CREATE PUBLICATION powersync`. Since PowerSync reads **all** publication tables, and the DB also holds Better Auth tables (user/session/account/jwks), **verify the publication lists only the sync tables** (7 exercise tables) rather than `FOR ALL TABLES` — otherwise auth-table churn replicates too.

### 3.2 Oversized / malformed uploads stay queued
`/powersync/upload` (`apps/server/src/powersync.ts`) returns **503 `{ok: false}`** for payloads over 64 KB, invalid JSON, schema failures, and database failures. The connector throws on every non-2xx response, so PowerSync keeps the local transaction queued for retry instead of acknowledging and discarding it. Contract tests cover the parser's malformed and oversized cases.

### 3.3 Validation rejections are logged, not silently acknowledged
Server-side validation rejects (unowned write, unknown body part/equipment, "custom exercises require a body part and equipment") return **200 `{ok: true, rejected: [...]}`** so the queue advances and server-authoritative state can reconcile. The connector logs the rejection count and reason. A user-facing notice or synced error table is still future work if product requirements call for it.

### 3.4 Seed pipeline depends on a 12-hour development token; instance setting unverified
`powersync:seed:publish` (`packages/db/src/seeding/powersync-seed.ts`, wired in `turbo.json`) authenticates with `POWERSYNC_DEVELOPMENT_TOKEN`. Dev tokens expire after **12 h** (https://docs.powersync.com/configuration/auth/development-tokens.md) and are only accepted when the instance's **Development tokens** toggle is on. `powersync/service.yaml` (committed as the source-of-truth template) leaves `allow_temporary_tokens` commented (default: false).
- **Recommended:** verify the seed target instance has dev tokens enabled, and either (a) regenerate the token as part of a documented seed run, or (b) switch the seed connector to a short-lived RS256 JWT minted by the same auth plugin (aud = `POWERSYNC_URL`, any subject — the seed asserts no user-owned rows) so it works without the dev-token toggle.

### 3.5 Schema-change procedure touches four places; no versioned streams yet
Per https://docs.powersync.com/maintenance-ops/implementing-schema-changes.md, a schema change must land in lockstep across: `packages/db/src/domains/exercises/schema.ts` (source, + drizzle migration), `powersync/sync-config.yaml` (stream queries must select new columns), `apps/native/features/exercises/schema.ts` (client view — no client "migration", just the app release), and `packages/db/src/seeding/powersync-seed.ts` (`new Schema(...)`, then re-publish the seed). All four are currently consistent; there is no migration checklist or documented runbook.
- **Recommended:** add a short checklist in `docs/` covering these four edits + `db:migrate:deploy` + `powersync deploy sync-config` + `powersync:seed:publish`, plus the docs' DDL caveats (no automatic column adoption; `TRUNCATE` before `DROP`; replica-identity changes re-replicate the table). Add versioned streams only when an old client build must stay on the previous schema.

### 3.6 Operational verification is not wired up
The repo has no documented monitoring/alerting setup. Cloud plan-dependent features per https://docs.powersync.com/maintenance-ops/monitoring-and-alerting.md: instance logs (Sync & API / Replicator / Compact / Migration), issue alerts (DB connection + replication, Warning/Fatal), usage alerts, and email/webhook notification rules (webhook body signed `x-journey-signature`, HMAC-SHA256).
- **Recommended (ops, not code):**
  1. Create Issue Alerts for **Database Connection** and **Replication** (Fatal severity), plus a notification rule (email and/or webhook; verify the `x-journey-signature` HMAC if webhook), and opt into **deploy state change** notifications.
  2. Add a periodic check habit: `powersync fetch instances` for instance status; dashboard Logs → Replicator with `lag:>=5` for replication lag; `error:PSYNC_` filters against https://docs.powersync.com/debugging/error-codes.md; export logs as CSV when investigating.
  3. Sanity-check streams with the Sync Diagnostics Client and a dev token (schema `edition: 3` + catalog count assertions already act as a cheap in-app check).

### 3.7 Minor
- `apps/native/features/exercises/queries.ts` — `exercisesQuery(search = "")` supports the local name filter; keep the parameter only while search UI is planned.
- `manifest.schemaVersion` (always `1`) is validated positively but not matched against the client `AppSchema`; if the client schema ever evolves, bump the schema version and reject stale seeds client-side (`preseed.ts`) to avoid a mismatched preseed being moved into place.
- Root `AGENTS.md` now points agents at the PowerSync skill before data, schema, or sync work; keep that pointer when updating the repo guidance.

---

## 4. Sources

Official docs (all under `https://docs.powersync.com/`, index: `/llms.txt`):
- `/configuration/source-db/setup.md`, `/configuration/source-db/postgres-maintenance.md`
- `/configuration/powersync-service/cloud-instances.md`
- `/configuration/auth/custom.md`, `/configuration/auth/development-tokens.md`
- `/configuration/app-backend/setup.md`, `/configuration/app-backend/client-side-integration.md`
- `/sync/streams/overview.md`, `/sync/streams/parameters.md`, `/sync/streams/bucket-count.md`, `/sync/streams/migration.md`, `/sync/advanced/client-id.md`, `/sync/types.md`
- `/handling-writes/writing-client-changes.md`, `/handling-writes/handling-write-validation-errors.md`
- `/client-sdks/reference/react-native-and-expo.md`, `/client-sdks/frameworks/expo-go-support.md`, `/client-sdks/advanced/pre-seeded-sqlite.md`
- `/maintenance-ops/implementing-schema-changes.md`, `/maintenance-ops/deploying-schema-changes.md`, `/maintenance-ops/monitoring-and-alerting.md`, `/maintenance-ops/replication-lag.md`
- `/tools/diagnostics-client.md`, `/tools/cli.md`, `/debugging/log-reference.md`, `/debugging/error-codes.md`

Repo artifacts reviewed: `powersync/{cli,service,sync-config}.yaml`, `.env.example`, `packages/auth/src/index.ts`, `apps/server/src/{index.ts,powersync.ts,powersync-contract.ts,powersync-r2.ts}`, `apps/server/src/powersync-contract.test.ts`, `packages/db/src/{domains/exercises, seeding/powersync-seed.ts}`, `apps/native/lib/powersync/*`, `apps/native/features/exercises/*`, `apps/native/app/_layout.tsx`, `turbo.json`.

Rubric: `.agents/skills/powersync/` (SKILL.md, AGENTS.md, `references/onboarding-custom.md`, `references/custom-backend.md`, `references/sync-config.md`, `references/sdks/powersync-js-react-native.md`, `references/powersync-service.md`, `references/powersync-debug.md`).
