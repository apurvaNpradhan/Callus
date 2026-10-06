import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterClient, type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { appRouter } from "@callus/api/routers/index";
import { auth } from "@callus/auth/index";
import { ENV_WEB_ISOMORPHIC } from "@callus/env/web/env.isomorphic";
import { createLogger } from "@callus/logger/server";

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(appRouter, {
      context: async () => {
        const headers = getRequestHeaders();
        const session = await auth.api.getSession({ headers });

        return {
          logger: createLogger({ operation: "web__client__orpc" }),
          session
        };
      }
    })
  )
  .client((): RouterClient<typeof appRouter> => {
    const link = new RPCLink({
      origin: ENV_WEB_ISOMORPHIC.VITE_SERVER_URL,
      url: "/rpc",
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include"
        });
      }
    });

    return createORPCClient(link);
  });

export const client = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
