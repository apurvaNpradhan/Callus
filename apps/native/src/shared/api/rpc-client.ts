import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { type RouterClient } from "@orpc/server";

import { type AppRouter } from "@callus/api/contract";

import { authClient } from "@/shared/api/auth-client";
import { serverUrl } from "@/shared/config";

const link = new RPCLink({
  origin: new URL(serverUrl).origin,
  // SAFETY: URL.pathname is root-relative and appending /rpc preserves that invariant.
  url: `${new URL(serverUrl).pathname.replace(/\/$/, "")}/rpc` as `/${string}`,
  fetch(url, options) {
    return fetch(url, { ...options, credentials: "omit" });
  },
  headers: async () => {
    const cookie = await authClient.getCookie();

    return cookie ? { cookie } : {};
  }
});

export const rpcClient: RouterClient<AppRouter> = createORPCClient(link);
