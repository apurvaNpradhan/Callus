# PowerSync

This is the PowerSync map for the current worktree. PowerSync Cloud reads the
Postgres source database and sends Sync Streams to the Expo client. Client writes
go to the application server first; PowerSync does not write directly to Postgres.

## Current architecture

```text
Expo client (@powersync/react-native + op-sqlite)
  ├─ credentials: session cookie → GET /powersync/credentials → short-lived JWT
  ├─ reads: JWT → PowerSync Cloud → powersync/sync-config.yaml
  ├─ writes: uploadData() → POST /powersync/upload → Postgres transaction
  └─ optional preseed: GET /powersync/seed → signed object-storage download
```

The main files are:

- `powersync/sync-config.yaml`: edition 3 Sync Streams.
- `powersync/service.yaml` and `powersync/cli.yaml`: Cloud/service and linked-instance configuration.
- `packages/auth/src/index.ts`: Better Auth JWT/JWKS setup.
- `apps/server/src/powersync.ts`: credentials, upload, and seed routes.
- `packages/powersync/src/{upload,apply,exercises,seed}.ts`: upload validation, writes, and seed download.
- `apps/native/lib/powersync/{connector,database,session,preseed}.ts`: client integration.
- `packages/powersync/src/seeding/powersync-seed.ts`: seed publisher.

`apps/native/features/exercises/catalog.ts` intentionally contains the body-part,
equipment, and muscle labels exclusively as local TypeScript lookup objects. They
are not PowerSync-synced lookup tables. The PowerSync schema, client database, and
preseed contain only `exercise` and the
`exercise_to_body_part`, `exercise_to_equipment`, and `exercise_to_muscle`
relationship rows. User-defined equipment may be added to sync later, but is not
implemented or scaffolded here.

## Streams and ownership

`exercise_catalog` auto-subscribes to exercises with `user_id IS NULL` and their
relationship rows. `user_exercises` auto-subscribes to rows whose `user_id` is the
authenticated user. Relationship IDs are deterministic:
`{exercise_id}:{lookup_id}`. Postgres check constraints and the upload layer enforce
those IDs and ownership. Custom exercise IDs are UUIDs.

The client maps timestamps and UUIDs to text and booleans to integer `0`/`1` in
`apps/native/features/exercises/schema.ts`.

## Auth and session lifecycle

Better Auth issues RS256 JWTs with the PowerSync URL as audience, the authenticated
user ID as subject, and a five-minute lifetime. PowerSync Cloud reads the public JWKS
at the URL configured in `powersync/service.yaml`.

`fetchCredentials()` sends the session cookie to `/powersync/credentials`; an
unauthenticated response returns no credentials. The client connects once for the
active owner. `usePowerSyncSession()` serializes transitions, disconnects while
offline, and uses `disconnectAndClear()` on logout or owner change. The owner marker
is stored in SecureStore on native and localStorage on web. Database initialization
adds a fresh `client_id` to `ps_kv` when absent.

## Upload contract

`POST /powersync/upload` accepts up to 64 KB and 200 allowlisted operations for
`exercise` and the three relationship tables. The server parses the payload, checks
ownership/lookups/invariants, and applies the whole batch in one Postgres transaction.

- `200 { ok: true, rejected: [] }`: the connector calls `transaction.complete()`.
- `200 { ok: true, rejected: [...], error }`: validation rejection; the queue advances and the connector logs it.
- `200 { ok: false, error }`: authentication failure; the connector throws.
- `503 { ok: false, error }`: malformed/oversized input or a temporary database failure; the connector throws so PowerSync retries.

The endpoint deliberately uses `200` for validation failures and `503` for retryable
failures. A `4xx` upload error would block the PowerSync queue. The server is the
authoritative write path; subsequent sync reconciles the client.

## Preseed behavior

`powersync:seed:publish` uses the PowerSync Node SDK and
`POWERSYNC_DEVELOPMENT_TOKEN` to wait for first sync, verify expected catalog counts
and that no user-owned exercises are present, remove `ps_kv.client_id`, and write a
portable SQLite snapshot with `VACUUM INTO`. It uploads the snapshot and a checksummed
manifest to object storage under `POWERSYNC_SEED_ENV`.

The authenticated `/powersync/seed` route validates the latest manifest and returns a
short-lived signed download URL. Native clients verify size, SHA-256, schema/count
metadata, and absence of user-owned exercises, remove `client_id`, then atomically
move the database into place. Any failure falls back to an empty local database;
web skips preseed. A fresh client ID is inserted before connecting.

## Operational configuration and safety

The linked instance is Cloud instance `6aa66e9c02481fb31b962287`. The service
configuration uses a Postgres connection from `PS_DATABASE_URI`, TLS
`sslmode: verify-full`, and the Better Auth JWKS URL. Secrets remain in environment
variables; do not put them in YAML or source.

Treat `powersync/service.yaml` and `powersync/cli.yaml` as operational configuration:
do not edit either file as part of ordinary application changes. Confirm the target
instance and deployment scope before making an operator-approved infrastructure
change. Sync query changes belong in `powersync/sync-config.yaml`. The source database
must have logical replication enabled, a replication-capable PowerSync role, and a
publication containing the tables intended for sync.

## Schema-change path

For a source or synced-column change:

1. Update `packages/db/src/schema/exercise.ts` and generate/apply the Drizzle migration.
2. Update the selected columns in `powersync/sync-config.yaml`.
3. Update the client view in `apps/native/features/exercises/schema.ts` and release the app; there is no client-side PowerSync migration.
4. Update the Node seed schema/count checks if the snapshot shape changes, then republish the seed.
5. Deploy the database migration and Sync Config in the environment, and keep older clients compatible when required.

Postgres DDL is not automatically replicated as schema metadata. New nullable columns
are the safest change; drops, renames, type changes, publication changes, and large
table or replica-identity changes need an explicit rollout plan.

## Runnable validation

From the repository root:

```sh
pnpm --filter @callus/powersync test
pnpm check-types
pnpm lint
pnpm format:check
```

The PowerSync package test covers the upload parser/allowlist. The other commands run
the repository type, lint, and formatting checks. Seed publishing is operational and
requires configured environment variables; it is not part of the validation commands
above.
