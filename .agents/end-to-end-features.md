# End-to-End Feature Workflow

Use this when implementing a feature that spans data model, shared domain contracts, API, and web UI.

This file defines implementation order for backend-backed features in the web app, native app, or both. For package-specific rules, follow the linked docs instead of repeating them here.

When a feature introduces shared contracts that should drive both API and clients, this workflow also includes `packages/core`.

## Default Order

1. If the feature needs new data or persisted fields, update `packages/db` first.
2. If the feature introduces shared enums, schemas, formatters, or defaults consumed across packages, update `packages/core` next.
3. Define or extend the oRPC contract in `packages/api`.
4. Add client data access in the owning feature: slice-local TanStack Query wrappers in `apps/web`, or a feature-local `api/` wrapper over the shared oRPC client in `apps/native`.
5. Handle user-visible client errors using typed oRPC errors and the owning feature's UI state.
6. Compose web routes through thin route files and screen slices; compose native routes through thin Expo Router files and screen slices. Follow [Data flow](./data-flow.md).
7. Run fixes and relevant validation according to [Workflow](./workflow.md), using [Choice flows](./choice-flows.md) only when a human decision is needed.

## Step 1: Database

- Edit schemas in `packages/db/src/schema/` when the feature changes persisted data.
- Follow [Workflow](./workflow.md) for migration generation, localhost `DATABASE_URL` safety, and migration application.
- Keep schema and migration work complete before defining API output shapes that depend on it.

## Step 2: Shared Domain Contract

- Use `packages/core` for shared Zod schemas, enums, normalizers, formatters, option builders, and defaults consumed by more than one package.
- Follow [Core package patterns](./core.md).
- Unless explicitly told not to, if a change should propagate automatically into both API and frontend behavior, centralize it in `packages/core` instead of duplicating literals in app code.
- Route validators, frontend filters, and shared API input or output schemas should import core contracts when they represent the same domain surface.

## Step 3: API Contract

- Add or extend the router in `packages/api`.
- Follow [oRPC patterns](./orpc.md) for procedure factories, explicit `input` and `output` schemas, and typed errors.
- Prefer type-safe errors with `.errors(...)` and `errors.MY_ERROR(...)` for expected failure cases the client needs to handle.

## Step 4: Web Data Layer

- Use the web-owned oRPC/TanStack Query integration from `apps/web/src/shared/lib/orpc.ts`.
- Follow [API fetching patterns](./api-fetching-patterns.md) for `*.query.ts`, `*.mutation.ts`, query keys, query options, and hook wrappers.
- Keep `orpc` and TanStack Query wiring inside slice-local `api/` files, not inline in page components.

## Step 5: Client Error Handling

- For user-visible failure states, follow the type-safe client error pattern in [oRPC patterns](./orpc.md).
- Do not duplicate string-matched or ad hoc client error handling in web slices when the server already defines typed oRPC errors.

## Step 6: Routes and UI

- Follow [Data flow](./data-flow.md) for thin TanStack routes, Expo Router route files, screen composition, and FSD import direction.
- Follow [UI guidelines](./ui.md) for app-level component composition.
- Add [Auth patterns](./auth.md), [SEO patterns](./seo.md), or [i18n guidelines](./i18n.md) when the feature touches those concerns.

## Validation

- Follow [Workflow](./workflow.md) for fix cadence and validation scope. For larger planned work, such as implementing a `plan.md`, run fixes at substantial milestones/phases and once more before final handoff. Follow [Testing](./testing.md) for focused regression, unit, and e2e coverage when behavior changes.
