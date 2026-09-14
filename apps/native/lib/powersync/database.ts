import { wrapPowerSyncWithDrizzle } from "@powersync/drizzle-driver";
import { PowerSyncDatabase } from "@powersync/react-native";
import { randomUUID } from "expo-crypto";
import { Paths } from "expo-file-system";
import { Platform } from "react-native";

import { AppSchema, drizzleSchema } from "./schema";

export const nativeDatabaseLocation =
  Platform.OS === "web"
    ? undefined
    : decodeURIComponent(Paths.document.uri.replace(/^file:\/\//u, ""));

export type PowerSyncDatabaseBundle = ReturnType<typeof createPowerSyncDatabase>;

export function createPowerSyncDatabase(
  options: { dbFilename?: string; dbLocation?: string } = {},
) {
  const powerSync = new PowerSyncDatabase({
    schema: AppSchema,
    database: {
      dbFilename: options.dbFilename ?? "callus.db",
      dbLocation: options.dbLocation ?? nativeDatabaseLocation,
    },
  });
  const drizzleDb = wrapPowerSyncWithDrizzle(powerSync, { schema: drizzleSchema });
  return { powerSync, drizzleDb };
}

export let powerSync: PowerSyncDatabase;
export let drizzleDb: ReturnType<typeof wrapPowerSyncWithDrizzle<typeof drizzleSchema>>;
let initialized = false;
let initPromise: Promise<void> | undefined;

export function setPowerSyncDatabase(database: PowerSyncDatabaseBundle) {
  powerSync = database.powerSync;
  drizzleDb = database.drizzleDb;
  initialized = false;
  initPromise = undefined;
}

export function getPowerSyncDatabase() {
  return powerSync && drizzleDb ? { powerSync, drizzleDb } : undefined;
}

export async function initializePowerSyncDatabase() {
  if (initialized) return;
  const database = powerSync;
  if (!database) throw new Error("PowerSync database is not configured");
  initPromise ??= (async () => {
    try {
      await database.init();
      const client = await database.getOptional<{ value: string | null }>(
        "SELECT value FROM ps_kv WHERE key = ?",
        ["client_id"],
      );
      if (!client?.value) {
        await database.execute("INSERT INTO ps_kv (key, value) VALUES (?, ?)", [
          "client_id",
          randomUUID(),
        ]);
      }
      initialized = true;
    } finally {
      initPromise = undefined;
    }
  })();
  await initPromise;
}
