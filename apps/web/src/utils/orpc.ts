import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { AppRouterClient } from "@callus/api/routers/index";
import { env } from "@callus/env/web";

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        toast.error(`Error: ${error.message}`, {
          action: {
            label: "retry",
            onClick: () => {
              query.invalidate();
            },
          },
        });
      },
    }),
  });
}

export const queryClient = createQueryClient();

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
const serverUrl = new URL("/rpc", getServerUrl(env.VITE_SERVER_URL));

export const link = new RPCLink({
  origin: serverUrl.origin,
  url: "/rpc",
  fetch(url, options) {
    return fetch(url, {
      ...options,
      credentials: "include",
    });
  },
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
