# Auth Patterns

## Architecture

- **Server**: Better Auth handles `/auth/*` on the Hono server (`apps/server`)
- **Web client**: `apps/web/src/shared/lib/auth/auth-client.ts` provides the Better Auth React client.
- **SSR**: `$getUser` in `apps/web/src/shared/lib/auth/tanstack-start/functions.ts` resolves sessions from request headers and forwards refreshed cookies.
- **Native client**: `apps/native/src/shared/api/auth-client.ts` uses Better Auth Expo and SecureStore; native oRPC fetch forwards the stored cookie.
- **Cookies**: Prefer Better Auth defaults for reusable projects — `SameSite=Lax` supports OAuth and other redirect-based flows without custom per-project overrides

## Query Pattern

Auth user query is defined in `@callus/auth`:

- `getAuthUserQueryOptions()` — staleTime 5 min, gcTime 10 min, refetchOnWindowFocus "always"
- Root route `beforeLoad` warms auth with a handled, non-blocking `queryClient.query` call.
- Auth-guarded routes perform a blocking static cache read, then revalidate in the background with the query's normal freshness. Other loaders and components
  consume the same shared auth query rather than router loader context, so revalidation
  remains centralized in TanStack Query.

## Route Guards

### Protected web routes (`(auth)/` layout group)

- `beforeLoad` calls `queryClient.query({ ...getAuthUserQueryOptions(), staleTime: "static" })`, then starts a handled background `queryClient.query(getAuthUserQueryOptions())`.
- No user → redirects to `/sign-in?redirect=<current-path>`
- Client-side `useEffect` re-checks auth for session expiry

### Guest-only web routes (`(guest)/` layout group)

- Authenticated users → redirected to stored redirect path
- `?redirect` param validated against route tree (sanitized)

## Middleware

Two auth middlewares exist for different sensitivity levels:

| Middleware            | Behavior                                 | Use case                                     |
| --------------------- | ---------------------------------------- | -------------------------------------------- |
| `authMiddleware`      | Uses cached session (5-min cookie cache) | Normal protected pages                       |
| `freshAuthMiddleware` | Hits DB, bypasses cache                  | Sensitive operations (password change, etc.) |

Both set 401 status and throw on unauthorized.

## Database Configuration

- Enable Drizzle joins through `advanced.database.joins`; the previous `experimental.joins` option is obsolete.
- The Better Auth 1.7.3 migration removes the generated account `issuer` field and its uniqueness constraint. Existing databases must apply the generated migration that drops both before running the upgraded auth packages.
- `packages/db/src/schema/auth.schema.ts` is generated from `packages/auth/src/index.ts` by `vp run auth:generate`. Do not hand-edit it.
- Change Better Auth-owned fields through the auth config, regenerate the schema, inspect the diff, and keep the owning database's baseline migration consistent.

## Schema extension

When extending a Better Auth `user` or `session` schema, update the config in `packages/auth/src/index.ts`, regenerate `packages/db/src/schema/auth.schema.ts` with `vp run auth:generate`, and generate a Drizzle migration. Do not edit generated schema files by hand. Keep `inferAdditionalFields<typeof auth>()` in each client that reads or writes custom fields.

`user.locale` is the shared language preference for signed-in web and native users. Validate values against the configured `en`/`de` enum. Web SSR reads the fresh account locale before guest cookie and browser language; native session restoration reads the account field before local guest preference or device language. On sign-in, use the account value; on sign-up, seed it from the guest locale.

## Gotchas

- Cross-domain auth setups still require deliberate cookie/domain/CORS configuration even with Better Auth defaults
- `SameSite=Strict` is usually too brittle for OAuth, email links, and other redirect-based auth flows
- The auth query uses `refetchOnWindowFocus: "always"` for cross-tab session sync
- Better Auth custom fields are not complete if you only add the DB column; the auth config, generated schema, and client inference must be updated together.
- In this repo, keep the main Drizzle relation graph in `packages/db/src/schema/relations.ts` with `defineRelations()`. Auth tables may add their own `defineRelationsPart()` in `packages/db/src/schema/auth.schema.ts`, and that part must be merged after the main relations in `packages/db/src/index.ts`.
