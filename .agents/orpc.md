# oRPC patterns

Use this for server procedures, routers, and client integration in this repository. The workspace uses oRPC v2 from the `2.0.0-beta.42` catalog. Read [the oRPC v2 skill](./skills/orpc/SKILL.md) for API details; do not use v1 `.route(...)` builder examples.

## Server procedures

Shared procedure factories live in `packages/api/src/lib/procedures/factory.ts`. The API router lives in `packages/api/src/routers/` and exports `AppRouter` through the type-only `packages/api/src/contract.ts` entry for clients that must not import server code at runtime.

- Use `publicProcedure` for public operations and `protectedProcedure` for authenticated operations.
- Build procedures with the `os` builder and `.handler(...)`; routers are plain nested objects.
- Declare runtime input schemas with `.input(...)`. Add `.output(...)` when it adds useful boundary validation or type-checking clarity.
- Add OpenAPI metadata with `.meta(openapi(...))` when an operation needs an explicit REST method/path or security metadata. `.route(...)` is not part of the current v2 builder.
- Put shared domain input/output schemas in `packages/core`; keep router-specific schemas and database work in the owning router slice.

```ts
export const exampleRouter = {
  byId: publicProcedure
    .input(z.object({ id: z.string().min(1) }))
    .output(z.object({ id: z.string(), name: z.string() }).nullable())
    .handler(async ({ input, context }) => {
      // Keep the handler linear and use its request-scoped context.
    })
};
```

## Errors and logging

- Declare expected typed errors with `.errors({ CODE: { message, data } })` and throw `errors.CODE()` from handlers. Do not put HTTP `status` in an error definition.
- Configure HTTP status mappings on `RPCHandler` or `OpenAPIHandler` with `errorStatusMap` when a code needs a non-default status.
- Use raw `ORPCError` for middleware or framework boundaries when a declared procedure error does not fit.
- Error messages and data are returned to clients. Keep secrets and internal details out of both.
- Use `context.logger` for request-scoped logging. Follow [Logging patterns](./logging.md); avoid routine procedure logs and duplicate error logging.

## Serving and clients

`apps/server/src/index.ts` serves the router with the fetch `RPCHandler` and `OpenAPIHandler` inside Hono. Preserve Hono's request context, CORS, health routes, and shared error handling when changing this integration.

- Web's isomorphic client and TanStack Query helpers live in `apps/web/src/shared/lib/orpc.ts`.
- Native's RPC client lives in `apps/native/src/shared/api/rpc-client.ts`; it imports `AppRouter` from `@callus/api/contract` as a type and explicitly forwards the Better Auth cookie.
- Keep native and browser clients independent. Do not import server procedure implementations into native runtime bundles.
- `RPCLink` uses `origin` plus a path-only `url`. Keep credentials and cookies appropriate to the client's auth model.

## Testing and toolchain

- Test procedures by calling them directly with `call` or `createRouterClient` and a focused context fixture. Follow [oRPC testing](./orpc-testing.md).
- Test browser/native transport only when transport behavior is part of the change.
- Use `vp` for dependency management and checks. Catalog versions live in `pnpm-workspace.yaml`; use `vp add` and update the catalog when adding or upgrading workspace packages.
- Follow [API fetching patterns](./api-fetching-patterns.md) for web query and mutation wrappers, and [Application data flow](./data-flow.md) for screen/route composition.
