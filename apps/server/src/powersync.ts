import { type EvlogVariables } from "evlog/hono";
import { Hono } from "hono";

import { auth } from "@callus/auth";
import { applyPowerSyncTransaction, ExerciseUploadRejectedError } from "@callus/db";
import { env } from "@callus/env/server";

import { parseUploadPayload } from "./powersync-contract";
import { getLatestSeedDownload } from "./powersync-r2";

export const powersyncRoutes = new Hono<EvlogVariables>();

async function getSession(c: { req: { raw: Request } }) {
  return auth.api.getSession({ headers: c.req.raw.headers });
}

powersyncRoutes.get("/credentials", async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const result = await auth.api.getToken({ headers: c.req.raw.headers });
  if (!result?.token) return c.json({ error: "Unable to issue PowerSync token" }, 503);

  return c.json({ endpoint: env.POWERSYNC_URL, token: result.token });
});

powersyncRoutes.post("/upload", async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ ok: false, error: "Unauthorized" }, 200);

  const parsed = parseUploadPayload(await c.req.text());
  if (!parsed.ok) {
    c.get("log").warn(parsed.error, { action: "powersync/upload", ok: false });
    return c.json({ ok: false, error: parsed.error }, 503);
  }

  try {
    await applyPowerSyncTransaction(session.user.id, parsed.data.operations);
  } catch (error) {
    if (error instanceof ExerciseUploadRejectedError) {
      return c.json({ ok: true, rejected: error.operationIds, error: error.message }, 200);
    }
    c.get("log").error(error instanceof Error ? error : new Error(String(error)));
    return c.json({ ok: false, error: "Temporary database failure" }, 503);
  }

  return c.json({ ok: true, rejected: [] });
});

powersyncRoutes.get("/seed", async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  try {
    return c.json(await getLatestSeedDownload());
  } catch (error) {
    c.get("log").error(error instanceof Error ? error : new Error(String(error)));
    return c.json({ error: "Exercise seed is temporarily unavailable" }, 503);
  }
});
