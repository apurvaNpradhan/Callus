import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { initLogger } from "evlog";
import { createAuthMiddleware, type BetterAuthInstance } from "evlog/better-auth";
import { createFsDrain } from "evlog/fs";
import { evlog, type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { createContext } from "@callus/api/context";
import { appRouter } from "@callus/api/routers/index";
import { auth } from "@callus/auth";
import { closeDatabase } from "@callus/db";
import { env } from "@callus/env/server";

initLogger({
  env: { service: "callus-server" },
});

const identifyUser = createAuthMiddleware(auth as BetterAuthInstance, {
  exclude: ["/api/auth/**"],
  maskEmail: true,
});

export const app = new Hono<EvlogVariables>();

app.use(evlog({ drain: env.NODE_ENV === "production" ? undefined : createFsDrain() }));
app.use("*", async (c, next) => {
  await identifyUser(c.get("log"), c.req.raw.headers, c.req.path);
  await next();
});

app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

const openapiGenerator = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
});

export const apiHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferenceHandlerPlugin({
      provider: "scalar",
      spec: () =>
        openapiGenerator.generate(appRouter, {
          base: { info: { title: "Callus API", version: "0.0.0" } },
        }),
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const context = await createContext({ context: c });

  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context: context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  const apiResult = await apiHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context: context,
  });

  if (apiResult.matched) {
    return c.newResponse(apiResult.response.body, apiResult.response);
  }

  await next();
});

app.get("/", (c) => {
  return c.text("OK");
});

import { serve } from "@hono/node-server";

export function createApp() {
  return app;
}

export async function startServer() {
  const server = serve(
    {
      fetch: createApp().fetch,
      port: env.PORT,
    },
    (info) => {
      console.log(`Server is running on http://localhost:${info.port}`);
    },
  );

  const shutdown = () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }).finally(closeDatabase);

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);

  return server;
}

const isMainModule = process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href;

if (isMainModule) {
  void startServer();
}
