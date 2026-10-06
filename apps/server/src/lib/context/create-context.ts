import { type Context as HonoContext } from "hono";

import { type OrpcContext } from "@callus/api/lib/context/types";
import { auth } from "@callus/auth/index";
import { type RequestLogger } from "@callus/logger/server";

export type CreateContextOptions = {
  context: HonoContext;
  logger: RequestLogger;
};

export async function createContext({
  context,
  logger
}: CreateContextOptions): Promise<OrpcContext> {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers
  });

  return {
    logger,
    session
  };
}
