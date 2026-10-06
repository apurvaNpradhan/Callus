import handler from "@tanstack/react-start/server-entry";

import { auth } from "@callus/auth/index";
import { ENV_WEB_SERVER } from "@callus/env/web/env.server";
import { paraglideMiddleware } from "@callus/i18n/server";
import { LOG_SERVICES, createRequestLogger, initLogger } from "@callus/logger/server";

initLogger({
  env: {
    environment: ENV_WEB_SERVER.NODE_ENV,
    service: LOG_SERVICES.WEB_SERVER,
    version: ENV_WEB_SERVER.SOURCE_COMMIT
  },
  sampling: {
    keep: [{ status: 400 }, { duration: 1000 }],
    rates: {
      info: 0
    }
  }
});

export default {
  async fetch(req: Request): Promise<Response> {
    let pathname = "/";

    try {
      pathname = new URL(req.url).pathname;
    } catch {
      // Request.url is normally valid; keep request logging from masking malformed input.
    }

    const requestLog = createRequestLogger({
      method: req.method,
      path: pathname
    });

    try {
      const isDocumentRequest =
        req.headers.get("Sec-Fetch-Dest") === "document" ||
        req.headers.get("Accept")?.includes("text/html") === true;

      let sessionCookies: string[] = [];

      if (isDocumentRequest) {
        const session = await auth.api.getSession({
          headers: req.headers,
          query: { disableCookieCache: true },
          returnHeaders: true
        });

        sessionCookies = session.headers?.getSetCookie() ?? [];
      }

      const response = await paraglideMiddleware(req, async () => {
        const resolved = await handler.fetch(req);

        if (!isDocumentRequest) {
          return resolved;
        }

        const headers = new Headers(resolved.headers);

        for (const cookie of sessionCookies) {
          headers.append("Set-Cookie", cookie);
        }

        return new Response(resolved.body, {
          headers,
          status: resolved.status,
          statusText: resolved.statusText
        });
      });

      requestLog.emit({ status: response.status });

      return response;
    } catch (error) {
      requestLog.error(error instanceof Error ? error : new Error(String(error)));
      requestLog.emit();
      throw error;
    }
  }
};
