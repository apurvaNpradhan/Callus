# PowerSync foundation for web and native

## Problem

Current Callus has PostgreSQL, Drizzle, Better Auth, a Hono/oRPC backend, TanStack Start web, and Expo native, but no PowerSync integration or personal domain tables. The previous Callus app provides useful PowerSync patterns, especially native account transitions, but copying its editable-library implementation would introduce aggregate uploads, outboxes, and feature behavior that this setup does not need. Its web client does not demonstrate browser PowerSync integration.

The foundation needs to prove secure downloads, offline writes, retry behavior, and account isolation on both platforms before a production fitness feature depends on it. A database that opens successfully is not evidence that replication, authentication, or uploads work.

## Agreed scope

Implement one bounded foundation spec with four ordered milestones. Include fresh local self-hosting, Dokploy deployment wiring, Better Auth JWT integration, authenticated uploads, platform-specific client lifecycle, and a development-only end-to-end test feature.

Use the existing Callus PostgreSQL database as the replication source. Use a separate PowerSync storage database and dedicated storage user on the same PostgreSQL server. Keep the existing backend responsible for authorization and applying client writes.

Support web and native together. Personal synced data is signed-in-only, with offline use after prior sign-in. The first web guarantee covers an already-loaded app during a network outage. Native also supports restarting offline for the last signed-in account.

The operator confirmed this design and authorized writing this spec. This document does not authorize implementation commands, remote deployment, production database changes, or reuse of an old instance.

## User and operator outcomes

- A developer can start a fresh local PowerSync instance against Callus PostgreSQL and verify replication and JWT acceptance.
- A signed-in developer can create, edit, and delete synthetic private test records on web and native, including while offline.
- Accepted changes appear on another connected client belonging to the same account.
- Cached native records and pending edits survive process restart while offline.
- A loaded web app continues local reads and writes offline, then uploads after reconnecting.
- Permanent rejected edits have visible outcomes; temporary failures retain the queue for retry.
- Another account cannot download, mutate, render, or upload the first account's records.
- Voluntary logout warns before discarding pending edits. Completed logout removes private cached data and the queue.
- Confirmed session expiry preserves pending edits behind reauthentication rather than silently destroying them.
- Deployment configuration can run a fresh PowerSync service on Dokploy without enabling the development test feature in production.

## Structure and ownership

```text
powersync/
  service.yaml                         # CLI-scaffolded service configuration
  sync-config*.yaml                    # Explicit development/deployment scope
  sql/                                 # Storage and replication provisioning

packages/auth/src/index.ts             # Better Auth JWT configuration
packages/db/src/schema/                # PostgreSQL test table and upload receipts
packages/core/src/sync/                 # Transport-safe upload/credential contracts
packages/api/src/routers/powersync/     # Session-authenticated credentials and uploads

packages/sync/src/
  schema.ts                            # Shared PowerSync client table definitions
  connector.ts                         # Shared credentials/queue behavior
  index.ts                             # Small public interface

apps/web/src/shared/lib/powersync/     # Browser database and lifecycle
apps/web/src/shared/providers/         # Client-only PowerSync provider
apps/native/src/shared/lib/powersync/  # OP-SQLite database and lifecycle
apps/native/src/shared/providers/      # Native PowerSync provider
```

- Add a small `@callus/sync` workspace package because both clients need the same local schema and queue behavior. Use platform-neutral PowerSync imports where supported. Align shared SDK dependency versions across the workspace.
- The shared connector receives the platform's authenticated credential and upload calls. It must not import either app, load environment variables, create a database, or implement another network client.
- Database construction, cookie forwarding, browser workers, native storage, and platform auth observations remain app-owned. Keep account orchestration small and explicit; extract shared transition logic only where actual duplicated behavior warrants it.
- Put test screens and actions in the existing FSD screen/feature structure, with thin routes. Follow the owning UI and i18n guides during implementation.
- Keep React, SQL schemas, SDK objects, and network code outside `packages/core`. Keep server handlers outside `packages/sync` and client runtime bundles.
- Feature-owned local queries and mutations belong in their feature slices. Start with parameterized SQL and PowerSync reactive hooks for the small test feature. Keep existing TanStack Query/oRPC patterns for auth and non-synced server data.
- Add no generic repository, adapter hierarchy, application outbox, Zustand store, or TanStack DB integration for this foundation. PowerSync already owns durable local writes and their upload queue.

## Service and database requirements

- Scaffold service/configuration through the current PowerSync CLI, using repository `vp`/`vpx` conventions. Read generated configuration before editing it. Use Sync Streams with `config.edition: 3`, not legacy Sync Rules.
- Create a fresh local setup and fresh Dokploy service/storage for this repo. Reuse no old credentials, instance identifiers, replication slots, bucket storage, or client queues. Inspect existing local resources before provisioning to avoid collisions.
- Use the existing source PostgreSQL service. Enable logical replication with the necessary server settings and restart requirements made explicit. Preserve existing volumes; initialization scripts alone are insufficient for already-initialized databases.
- Provision a dedicated replication role with the permissions required by PowerSync, and explicit SELECT grants/publication membership for the development test table. Do not use an application administrator or superuser as the replication connection.
- Publish only intended application tables. Auth users, sessions, accounts, verification data, JWKS/private keys, upload receipts, and PowerSync storage must remain outside publication and streams. The exercise catalog is also excluded.
- Provision a separate storage database and storage role on the PostgreSQL server. PowerSync owns its storage schema/migrations; application Drizzle migrations must not manage them. PostgreSQL storage does not provide MongoDB-only storage-version-4/S3 functionality, which this delivery does not require.
- Use explicit development and deployment sync scope. Production configuration contains no active development test stream. Validate whether the selected service supports empty stream configuration; if not, keep the production service disabled until a real production stream exists rather than enabling synthetic records to make startup pass.
- Pin a current stable PowerSync service image during implementation. Install current compatible SDK packages using `@latest` through the workspace toolchain, then record resolved versions in the lockfile. Do not copy the old `latest` service image or host-networking setup.
- Extend relevant local Compose configurations, including the database development lane when needed, and `docker-compose.dokploy.yaml`. Reuse the existing Docker networks and migration ownership. CLI Docker generation must not create a competing application source database.
- Give deployed PowerSync a dedicated HTTPS hostname and streaming-compatible proxy behavior. Account for long-lived connections and response buffering. Keep database, metrics, and administrative access private or appropriately restricted.
- Configure reachable JWKS and database addresses from inside the PowerSync container. Localhost inside a container is not the host backend. Native physical-device URLs must also be reachable from the device.
- Any allowance for private-network JWKS fetching must be intentional and limited to the fixed trusted backend URL for that environment. Keep authentication enabled in local development too.
- Keep application, replication, storage, and admin credentials distinct. Validate new application variables in the correct `packages/env` objects and propagate values to the services/builds that consume them. Use `!env` for service secrets and ignored local environment files; public client settings contain no secrets.
- Include liveness/readiness checks, sanitized service logging, replication-lag/WAL-slot inspection, and a compaction invocation or schedule appropriate to the selected storage/service version. Do not build a new monitoring platform.
- The initial topology is a single-server deployment, not high availability. Resource sizing, target hostname, production credentials, and live rollout timing are deployment inputs to collect later, not assumptions or implementation-readiness claims.

## Authentication and credential flow

- Keep Better Auth as the sole login/session system. Add its JWT plugin in `packages/auth`, using asymmetric signing, encrypted private-key storage, minimal payload, user ID as subject, issued-at/expiry claims, and a PowerSync-specific audience matching service configuration.
- Use five-minute PowerSync tokens. The credential response provides the correct instance endpoint, token, and expiry hint. PowerSync refreshes credentials through the connector; the application must not reconnect the database on every token refresh.
- Reuse Better Auth token issuance and its JWKS endpoint. A small protected credential procedure may combine the endpoint and issued token for both clients; it must not implement a second signer or duplicate key storage.
- Derive identity from a validated Better Auth session, never an input user ID. Check credential identity against the database's active owner before connecting or returning refreshed credentials.
- Keep uploads authenticated through the existing Better Auth session and native/web cookie mechanisms. A PowerSync download JWT is not automatically an application upload credential.
- Use fresh session validation where needed for issuance and uploads so cached UI auth is not server authorization. Configure and test the actual Better Auth API behavior rather than assuming a route guard revokes access.
- Regenerate the Better Auth-owned schema through `vp run auth:generate`, inspect the result, and generate the required Drizzle migration. Do not hand-edit generated auth tables.
- Support overlapping public keys during rotation and verify `kid`, algorithm, audience, and expiry against the service. Short-lived JWTs limit, but do not eliminate, the time a previously issued token remains usable after session revocation.
- Keep keys, tokens, cookies, row contents, and connection passwords out of logs. Authentication failure is distinct from a rejected data edit.

## Development test feature and uploads

- Use a minimal `sync_test_records` domain with a client-generated UUID, immutable owning user ID, and one bounded editable text field. Use synthetic content only. Preserve stable IDs across retries and devices.
- Define the local PowerSync schema once in `packages/sync`. Do not declare an `id` column in a PowerSync `Table`; the SDK creates it. Keep the PostgreSQL source schema separate and test the source-to-client column mapping.
- Auto-subscribe the development stream to records filtered by `auth.user_id()`. Client-provided user or subscription parameters are not authorization.
- Provide development screens on both clients to list and create/edit/delete records, display connection/first-sync/pending-upload status, and show sanitized rejected-write details. This is validation tooling, not a production notes feature.
- Enable it through an explicit development/test opt-in that is off by default for deployment. Gate the backend as well as routes. Production builds omit test-screen delivery and production publication/streams exclude its rows. A development screen flag must not silently become a bypass for ordinary authenticated APIs.
- Accept a bounded transaction envelope through the existing authenticated oRPC backend. Validate protocol shape, table/operation/column allowlists, identifiers, text bounds, and ownership. Avoid client-controlled SQL identifiers or unrestricted generic CRUD.
- Apply one local write transaction atomically in one source-database transaction. A domain rejection rolls back the whole transaction and returns a normal acknowledged rejection outcome with safe details.
- Derive insert ownership from the session. For updates/deletes, authorize against persisted ownership; another user's row ID must never grant access. Ownership cannot be reassigned by PATCH or PUT.
- Capture the expected database owner for connector calls and reject session/database identity mismatches without completing the queue. This fences stale callbacks and browser cookies that changed to another account.
- Apply changed fields in server commit order. The last accepted update wins for that field. PATCH against a deleted/nonexistent row does not recreate it. Concurrent edits are not resolved by client clocks. Future production domains may choose different conflict policies.
- Persist a retry receipt scoped to authenticated owner plus a stable client/database and queued-transaction identity. Commit the receipt and source writes atomically. Repeating an acknowledged upload returns its recorded outcome without applying it again, even after another client has changed the row. Reject reuse of an upload identity for different contents. Receipts are backend-only, not synced data.
- Preserve transaction boundaries and send uploads sequentially using the SDK queue. Call `transaction.complete()` only after the backend durably accepts or explicitly rejects that transaction, and after rejected outcomes are recorded for display.
- Expected permanent data rejection uses a successful transport response containing a typed outcome. Network errors, database failures, session failures, and unexpected protocol/schema bugs retain the queue for retry, reauthentication, or developer repair. Do not convert every caught exception into a successful acknowledgement.
- Use SDK server-state reconciliation after acknowledged rejection. Do not invent a second rollback engine or silently drop failed edits. Keep a small local-only rejection record if needed to retain the visible outcome across restart; do not add the old aggregate rejected-draft/outbox system.

## Client lifecycle and privacy

- Maintain one stable database instance per active account lifecycle. Connect once when a session is established; token refresh, focus, and network changes must not open redundant connections.
- Serialize real ownership transitions. Prevent new writes/uploads during a transition, hide the outgoing account's consumers, stop its connection, and finish required cleanup before exposing or connecting another account.
- Keep database ownership markers durable and distinct from transient connection status. Clear/reset markers and client upload identities when storage is discarded. Local markers support restoration; they do not authorize server access.
- Reconfirmation of the same identity must not clear the database, remount readers, or wait for sync. Test this under delayed auth responses, not just fast localhost sessions.
- Separate local database readiness from network authentication and first-sync readiness. Previously cached native data must open offline without awaiting token retrieval or `waitForFirstSync()`. Never treat an incomplete initial download as a confirmed empty remote dataset.
- On a fresh installation with no downloaded rows, provide an honest initial-sync/offline-empty state and retry path. Connection promises alone do not establish readiness.
- On voluntary logout with no pending edits, stop sync and clear private cached data and queue. With pending edits, offer cancel logout or explicit discard. Do not revoke the session or destroy work before the person decides. Freeze writes while deciding so the pending count cannot race with cleanup.
- On confirmed session expiry/revocation, pause uploads and hide private screens while retaining queued edits for same-account reauthentication. A network failure alone is not a confirmed logout. Persist the locked state so an offline restart cannot undo a previously confirmed expiry.
- Signing into another account while an old queue is retained requires resolving that queue through the agreed discard/cancel flow. Never upload it using the new session. Completed logout uses full `disconnectAndClear()`, not soft clearing or background retention.
- Browser tabs must observe account/logout changes and coordinate cleanup of the shared database/worker. An old tab cannot continue reading or queueing the previous account's rows or upload using newly changed cookies. Include server-side owner fencing as well as client coordination.
- Keep the web database and workers client-only under TanStack Start. SSR must not instantiate SQLite or share account data through module-level server state. Use a deterministic SSR fallback and protect Strict Mode/HMR remounts from destroying an active database instance.
- Configure Vite worker/WASM handling against the selected current SDK. Preserve existing plugins and verify a production build, not only the dev server.
- Use native OP-SQLite and an Expo development build. Rebuild after native dependency changes; Expo Go's experimental SQL-JS adapter is excluded.
- This foundation uses synthetic data and does not promise database encryption at rest, OS-level user isolation, or background sync while a mobile app is suspended. Locked UI is not encrypted storage. Revisit sensitive-data retention/encryption before adding production health or fitness records.

## Implementation milestones

1. **Service and replication.** Scaffold configuration, provision isolated local storage/roles/publication, migrate the test table, and start the local service. Completion requires diagnostics proving source replication and correct user-scoped test rows, plus validation of development and production-exclusion configuration.
2. **Auth and upload backend.** Configure Better Auth JWT/JWKS and generated migrations, implement credential/upload contracts, and verify authorization, atomic rejection, and retry receipts. Completion requires the service accepting a real session-derived JWT and procedure/integration tests proving accepted and rejected transactions. Finish this backend readiness gate before app integration.
3. **Web and native lifecycle.** Add shared schema/connector, platform databases/providers, offline restoration, expiry/logout handling, and browser account coordination. Completion requires deterministic lifecycle tests and successful web/native build checks with no SDK leaking into SSR.
4. **End-to-end proof.** Add development test screens and run local sync workflows against disposable dependencies. Completion requires offline writes returning through the real authenticated backend, cross-client convergence, account-isolation checks, and production-exclusion checks. Report device/platform gaps rather than substituting typechecking for runtime evidence.

These are ordered implementation checkpoints in one delivery, not permission to deploy midway or to expand into product features.

## Acceptance and testing

Follow repository Vite+ testing and oRPC testing policies. Routine tests use disposable local PostgreSQL/PowerSync dependencies and synthetic records, never remote services or old/shared databases.

- Credential tests prove anonymous denial, validated-session subject, minimal claims, audience/expiry, key persistence across backend restart, and service verification of real JWKS-backed tokens.
- Upload procedure/integration tests prove actor-derived ownership, denial of foreign IDs/owner reassignment, atomic multi-operation behavior, bounded input, safe rejection outcomes, and retry on transient failures. Do not mock the handler or SQL behavior being proved.
- Retry tests simulate response loss after commit and connector restart before queue completion. Re-upload returns the prior outcome and does not overwrite a newer edit from another client. Test duplicate-ID/identity misuse without granting access to someone else's row.
- Stream tests prove two accounts receive only their own rows and that deletion/removal converges. Check publication/stream exclusion of auth, receipts, storage, and catalog tables.
- Lifecycle tests cover slow initial auth, same-user reconfirmation, offline restoration, explicit expired-session restoration, logout cancel/discard, different-account sign-in, transition errors, and stale async callbacks. Throttle auth deterministically to reproduce ordering.
- Real browser workflows prove client-only initialization, worker/WASM loading, offline create/edit/delete in a loaded app, reconnect, visible rejection, and cross-tab logout/account switching. Use isolated browsers/contexts for distinct users and same-context tabs for shared-cookie races.
- Native runtime verification proves OP-SQLite linking, offline process restart, retained queue upload after reconnect, and same/different-account recovery. Use the available emulator/device workflow and report which platform was actually exercised. Compilation alone is insufficient.
- Verify initial sync, previously cached reads, offline empty state, expired auth, and upload rejection are visibly distinguishable. Tests must not require waiting for a network checkpoint to open cached offline records.
- Verify production builds omit the test screen, backend test operations are disabled, and production replication excludes test records. Test configuration with the flags off as well as on.
- Run scoped fixes/tests at milestones, then workspace checks and relevant web/native builds for cross-package changes. No tests or runtime checks are required merely to write this spec.

## Out of scope

- Syncing the public exercise catalog or changing `docs/specs/exercise-catalog.md`.
- Saved exercises, training notes as a product feature, custom exercises, routines, workouts, health records, attachments, and file queues.
- Guest offline editing or guest-to-account merging.
- Full offline web boot, service-worker/PWA caching, or guaranteed mobile background syncing.
- Old account/data migration, existing-instance reuse, or copying the previous package architecture.
- CRDTs, row-version conflict UI, generic upload engines, additional client state libraries, and broad ORM adoption for the test table.
- High availability, Kubernetes, sharding, S3 sync storage, or a new observability platform.
- Live database changes, production rollout, credential collection in chat, and infrastructure mutations without separate explicit target approval.

## Sources and follow-up

The old implementation was reviewed read-only under `~/Workspace/projects_old/callus_old/`. Useful evidence is in `powersync/service.yaml`, `powersync/sync-config.yaml`, `powersync/sql/setup-replication.sql`, `apps/api/src/auth.ts`, `apps/api/src/powersync/`, and `apps/native/features/library/`. Its native runtime demonstrates serialized ownership changes; its aggregate library write machinery is not a requirement for this foundation. Its Dokploy file does not deploy PowerSync.

Use the installed [PowerSync skill](../../.agents/skills/powersync/SKILL.md) and its mandatory `AGENTS.md` playbook during implementation. The current primary documentation index is [docs.powersync.com/llms.txt](https://docs.powersync.com/llms.txt). Relevant references:

- [Self-hosted instance configuration](https://docs.powersync.com/configuration/powersync-service/self-hosted-instances.md)
- [Source database setup](https://docs.powersync.com/configuration/source-db/setup.md)
- [Sync Streams](https://docs.powersync.com/sync/streams/overview.md)
- [Custom authentication](https://docs.powersync.com/configuration/auth/custom.md)
- [Write and validation errors](https://docs.powersync.com/handling-writes/handling-write-validation-errors.md)
- [Better Auth JWT plugin](https://www.better-auth.com/docs/plugins/jwt)
- [PowerSync CLI](https://docs.powersync.com/tools/cli.md)

Implementation must verify installed APIs and CLI help rather than copying reference version numbers. Ask for environment-specific URLs and credentials only when needed, record secrets in the appropriate ignored environment files, and separately confirm any live mutation target. After onboarding works, offer the PowerSync skill pointer for the root agent context as required by the skill; this spec does not authorize editing that context now.
