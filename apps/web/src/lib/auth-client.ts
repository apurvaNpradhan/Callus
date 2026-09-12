import { createAuthClient } from "better-auth/react";

import { env } from "@callus/env/web";

function getServerUrl(url: string): string {
  const processEnv = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process?.env;

  const normalized = url.replace(/\/+$/, "");

  if (!normalized.startsWith("/")) {
    return normalized;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${normalized}`;
  }

  const serverUrl = processEnv?.SERVER_URL ?? "http://localhost:3000";

  return `${serverUrl.replace(/\/+$/, "")}${normalized}`;
}
export const authClient = createAuthClient({
  // better-auth derives its route-matching base from this URL's path, so the
  // public auth path must equal the server-side mount (/api/auth everywhere)
  baseURL: new URL("/api/auth", getServerUrl(env.VITE_SERVER_URL)).toString(),
});
