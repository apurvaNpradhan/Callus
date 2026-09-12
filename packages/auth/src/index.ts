import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";

import { db } from "@callus/db";
import { account, session, user, verification } from "@callus/db/schema/auth";
import { env } from "@callus/env/server";

export function createAuth() {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema: { account, session, user, verification },
    }),
    trustedOrigins: [
      env.CORS_ORIGIN,

      "callus://",
      "exp://",
      "http://localhost:8081",
    ],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    plugins: [expo()],
  });
}

export const auth = createAuth();
