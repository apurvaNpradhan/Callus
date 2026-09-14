import { createEnv } from "@t3-oss/env-core";
import "dotenv/config";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    POWERSYNC_URL: z.url(),
    PS_DATABASE_URI: z.string().min(1).optional(),
    PS_DATABASE_CA_CERT: z.string().min(1).optional(),
    R2_ACCOUNT_ID: z
      .string()
      .regex(/^[a-f0-9]{32}$/i)
      .optional(),
    R2_ACCESS_KEY_ID: z.string().min(1).optional(),
    R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    R2_BUCKET: z.string().min(1).default("callus"),
    POWERSYNC_SEED_ENV: z.enum(["development", "staging", "production"]).default("development"),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
