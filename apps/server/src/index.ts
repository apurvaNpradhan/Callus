import { hostname } from "node:os";
import { join } from "node:path/posix";

import { serve } from "@hono/node-server";
import { SmartCoercionHandlerPlugin } from "@orpc/json-schema";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { GetMethodCsrfProtectionHandlerPlugin, RethrowHandlerPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type ContentfulStatusCode } from "hono/utils/http-status";

import { appRouter } from "@callus/api/routers/index";
import { auth, generateAuthOpenApiSchema } from "@callus/auth/index";
import { migrateDatabase } from "@callus/db";
import { ENV_SERVER } from "@callus/env/server/env";
import { log, parseError } from "@callus/logger/server";
import {
  honoLogIngestionMiddleware,
  honoLoggerMiddleware,
  type HonoLogVariables
} from "@callus/logger/server/hono/middleware";

import { createContext } from "#@/lib/context/create-context";
import "#@/shared/lib/logger";

const serverHostname = hostname();

let serverUrl: URL;

let webUrl: URL;

try {
  serverUrl = new URL(ENV_SERVER.VITE_SERVER_URL);
  webUrl = new URL(ENV_SERVER.VITE_WEB_URL);
} catch (cause) {
  throw new Error("Invalid API server or web URL", { cause });
}

const serverPath = serverUrl.pathname;

const schemaConverter = new ZodToJsonSchemaConverter();

const openApiGenerator = new OpenAPIGenerator({ converters: [schemaConverter] });

export const app = new Hono<HonoLogVariables>().basePath(serverPath);

app.use(
  "/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization", "X-Request-Id", "expo-origin"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    origin: [webUrl.origin]
  })
);

app.use(
  "/*",
  honoLoggerMiddleware({
    exclude: ["**/health/**", "**/_logs/ingest"],
    enrich: (ctx) => {
      ctx.event.hostname = serverHostname;
    }
  })
);

app.post("/_logs/ingest", honoLogIngestionMiddleware());

app.onError((error, c) => {
  const requestLog = c.get("log");

  if (requestLog) {
    requestLog.error(error);
  } else {
    log.error({ event: "hono_global_error", error });
  }

  const parsed = parseError(error);

  return c.json(
    {
      message: parsed.message,
      code: parsed.code === "" ? undefined : parsed.code,
      why: parsed.why === "" ? undefined : parsed.why,
      fix: parsed.fix === "" ? undefined : parsed.fix,
      link: parsed.link === "" ? undefined : parsed.link
    },
    // SAFETY: parseError maps every supported application error to a valid HTTP status.
    parsed.status as ContentfulStatusCode
  );
});

/**
 * Disable /auth/reference calls as they are handled by the OpenAPI generator
 * @see https://better-auth.com/docs/plugins/open-api#configuration
 */
if (ENV_SERVER.ENABLE_OPEN_API_DOCS) {
  app.on(["POST", "GET"], "/auth/reference", (c) =>
    c.redirect(`${ENV_SERVER.VITE_SERVER_URL}/docs#auth-api-reference`, 301)
  );

  app.get("/auth/open-api/generate-schema", async (c) => {
    // Better Auth's generated schema endpoint needs this explicit route before /auth/*.
    const schema = await generateAuthOpenApiSchema();

    return c.json(schema);
  });
}

app.on(["POST", "GET"], "/auth/*", async (c) => {
  const request = c.req.raw;

  // Android can send Origin: null; Expo's origin header is the trusted origin
  // Better Auth should validate for native requests.
  if (request.headers.get("origin") === "null" && request.headers.has("expo-origin")) {
    const headers = new Headers(request.headers);
    headers.delete("origin");

    return auth.handler(new Request(request, { headers }));
  }

  return auth.handler(request);
});

export const openApiHandler = new OpenAPIHandler(appRouter, {
  errorStatusMap: { SERVICE_UNAVAILABLE: 503 },
  interceptors: [
    onError((error, { context }) => {
      context.logger.set({ handler: "openapi" });
      context.logger.error(error instanceof Error ? error : String(error));
    })
  ],
  plugins: [
    new SmartCoercionHandlerPlugin({
      converters: [schemaConverter]
    }),
    new OpenAPIReferenceHandlerPlugin({
      docsPath: "/docs",
      spec: () =>
        openApiGenerator.generate(appRouter, {
          base: {
            components: {
              securitySchemes: {
                authCookie: {
                  description: `**(optional)** Session cookie from signing-in, required for protected endpoints [View Auth Reference](${ENV_SERVER.VITE_SERVER_URL}/docs#auth-api-reference)`,
                  in: "cookie",
                  name: "better_auth.session_token",
                  type: "apiKey"
                }
              }
            },
            info: {
              description: `This is the API for @callus/server.\n## Usage\nFor authentication, you can sign in via the \`/sign-in\` endpoint in [the Auth Reference](${ENV_SERVER.VITE_SERVER_URL}/docs#auth-api-reference). Include the session cookie in subsequent requests to access protected endpoints.\n## Resources\n - [Official Website](${ENV_SERVER.VITE_WEB_URL})\n - [Auth API Reference](${ENV_SERVER.VITE_SERVER_URL}/docs#auth-api-reference)`,
              title: "@callus/server API",
              version: ENV_SERVER.SOURCE_COMMIT
            },
            servers: [{ description: "Primary API Server", url: ENV_SERVER.VITE_SERVER_URL }]
          }
        }),
      specPath: "/docs/spec.json"
    }),
    new RethrowHandlerPlugin({
      filter: (error) => error.constructor.name !== "ORPCError"
    })
  ]
});

export const rpcHandler = new RPCHandler(appRouter, {
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  errorStatusMap: { SERVICE_UNAVAILABLE: 503 },
  interceptors: [
    onError((error, { context }) => {
      context.logger.set({ handler: "rpc" });
      context.logger.error(error instanceof Error ? error : String(error));
    })
  ],
  plugins: [new GetMethodCsrfProtectionHandlerPlugin()]
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c, logger: c.get("log") });

  // oRPC at /rpc/*
  const rpcResult = await rpcHandler.handle(c.req.raw, {
    context,
    // SAFETY: serverPath is root-relative and join preserves its leading slash.
    prefix: join(serverPath, "rpc") as `/${string}`
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  // OpenAPI docs at /docs/*
  if (ENV_SERVER.ENABLE_OPEN_API_DOCS) {
    const docsResult = await openApiHandler.handle(c.req.raw, {
      context,
      // SAFETY: serverPath is root-relative and join preserves its leading slash.
      prefix: join(serverPath, "docs") as `/${string}`
    });

    if (docsResult.matched) {
      return c.newResponse(docsResult.response.body, docsResult.response);
    }
  }

  // OpenAPI REST API at /*
  const openApiResult = await openApiHandler.handle(c.req.raw, {
    context,
    // SAFETY: serverPath is built from the validated root-relative app configuration.
    prefix: serverPath as `/${string}`
  });

  if (openApiResult.matched) {
    return c.newResponse(openApiResult.response.body, openApiResult.response);
  }

  await next();
});

void (async () => {
  await migrateDatabase();

  serve(
    {
      fetch: app.fetch,
      port: 3000
    },
    (info) => {
      log.info("server", `Server is running on http://localhost:${info.port}${serverPath}`);
    }
  );
})();
