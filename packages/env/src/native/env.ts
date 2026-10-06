import { createEnv } from "@t3-oss/env-core";
import { isProduction } from "std-env";
import { z } from "zod";

export const ENV_NATIVE = createEnv({
  client: {
    EXPO_PUBLIC_SERVER_URL: isProduction ? z.url() : z.url().default("http://localhost:3000")
  },
  clientPrefix: "EXPO_PUBLIC_",
  emptyStringAsUndefined: true,
  runtimeEnv: {
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL
  }
});
