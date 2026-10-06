import { type AuthSession } from "@callus/auth/index";
import { type RequestLogger } from "@callus/logger/server";

export type OrpcContext = {
  session: AuthSession | null;
  logger: RequestLogger;
};
