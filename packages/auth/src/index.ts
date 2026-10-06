import { join } from "node:path/posix";

import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { openAPI } from "better-auth/plugins";

import { db } from "@callus/db";
import * as schema from "@callus/db/schema";
import { ENV_SERVER } from "@callus/env/server/env";

let serverUrl: URL;

let webUrl: URL;

try {
  serverUrl = new URL(ENV_SERVER.VITE_SERVER_URL);
  webUrl = new URL(ENV_SERVER.VITE_WEB_URL);
} catch (cause) {
  throw new Error("Invalid auth server or web URL", { cause });
}

export const auth = betterAuth({
  baseURL: serverUrl.origin,
  basePath: join(serverUrl.pathname, "auth"),
  trustedOrigins: [
    webUrl.origin,
    "callus://",
    ...(ENV_SERVER.NODE_ENV === "development" ? ["exp://"] : [])
  ],
  secret: ENV_SERVER.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),

  user: {
    additionalFields: {
      locale: {
        type: ["en", "de"],
        required: true,
        defaultValue: "en",
        input: true
      }
    }
  },

  // https://www.better-auth.com/docs/concepts/session-management#session-caching
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  },

  // https://www.better-auth.com/docs/authentication/email-password
  emailAndPassword: {
    enabled: true
  },

  advanced: {
    database: {
      // https://www.better-auth.com/docs/adapters/drizzle#joins
      joins: true
    }
  },

  plugins: [expo(), ...(ENV_SERVER.ENABLE_OPEN_API_DOCS ? [openAPI({ theme: "deepSpace" })] : [])],

  telemetry: {
    enabled: false
  }
});

type OpenApiEndpoints = ReturnType<typeof openAPI>["endpoints"];

// Better Auth exposes this endpoint at runtime, but currently omits it from the
// inferred `auth.api` type: https://github.com/better-auth/better-auth/issues/8688
// SAFETY: Better Auth exposes this runtime endpoint despite omitting it from the inferred API type.
export const generateAuthOpenApiSchema = (
  auth.api as typeof auth.api & Pick<OpenApiEndpoints, "generateOpenAPISchema">
).generateOpenAPISchema;

export type Auth = typeof auth;

export type AuthSession = typeof auth.$Infer.Session;

export type AuthUser = typeof auth.$Infer.Session.user;

export * from "#@/schema";
