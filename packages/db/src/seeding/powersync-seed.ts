import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
dotenv.config({
  path: "../../apps/server/.env",
});

import {
  column,
  PowerSyncDatabase,
  Schema,
  Table,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials,
} from "@powersync/node";
import dotenv from "dotenv";

import { CONTENT_TYPES, createStorageFromEnv, type Storage } from "@callus/storage";

const expectedCounts = {
  exercises: 7542,
  bodyParts: 20,
  equipment: 28,
  muscles: 44,
  bodyPartLinks: 8786,
  equipmentLinks: 7561,
  muscleLinks: 35358,
};

const schema = new Schema({
  body_part: new Table({ name: column.text }),
  equipment: new Table({ name: column.text }),
  muscle: new Table({ name: column.text }),
  exercise: new Table({
    user_id: column.text,
    name: column.text,
    exercise_type: column.text,
    instructions: column.text,
    image_key: column.text,
    video_key: column.text,
    created_at: column.text,
    updated_at: column.text,
  }),
  exercise_to_body_part: new Table({ exercise_id: column.text, body_part_id: column.text }),
  exercise_to_equipment: new Table({ exercise_id: column.text, equipment_id: column.text }),
  exercise_to_muscle: new Table({
    exercise_id: column.text,
    muscle_id: column.text,
    is_primary: column.integer,
  }),
});

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

function countQuery(table: string) {
  return `SELECT count(*) AS count FROM ${table}`;
}

async function verifyCatalog(database: PowerSyncDatabase) {
  const count = async (table: string) =>
    (await database.get<{ count: number }>(countQuery(table))).count;
  const actual = {
    exercises: await count("exercise"),
    bodyParts: await count("body_part"),
    equipment: await count("equipment"),
    muscles: await count("muscle"),
    bodyPartLinks: await count("exercise_to_body_part"),
    equipmentLinks: await count("exercise_to_equipment"),
    muscleLinks: await count("exercise_to_muscle"),
  };
  if (JSON.stringify(actual) !== JSON.stringify(expectedCounts))
    throw new Error(`Seed catalog counts did not match: ${JSON.stringify(actual)}`);
  const users = await database.get<{ count: number }>(
    "SELECT count(*) AS count FROM exercise WHERE user_id IS NOT NULL",
  );
  if (users.count !== 0) throw new Error("Seed account received user-owned exercises");
}

function manifestFor(version: string, objectKey: string, checksum: string, size: number) {
  return { version, objectKey, checksum, size, schemaVersion: 1, catalogCounts: expectedCounts };
}

async function main() {
  const seedEnvironment = process.env.POWERSYNC_SEED_ENV ?? "development";
  if (!/^(development|staging|production)$/u.test(seedEnvironment))
    throw new Error("POWERSYNC_SEED_ENV is invalid");
  const credentials: PowerSyncCredentials = {
    endpoint: required("POWERSYNC_URL"),
    token: required("POWERSYNC_DEVELOPMENT_TOKEN"),
  };
  const storage = createStorageFromEnv(process.env);
  const directory = await mkdtemp(path.join(os.tmpdir(), "callus-powersync-seed-"));
  const databasePath = path.join(directory, "sync.sqlite");
  const snapshotPath = path.join(directory, "catalog.sqlite");
  let database: PowerSyncDatabase | undefined;
  try {
    const connector: PowerSyncBackendConnector = {
      fetchCredentials: async () => credentials,
      uploadData: async (candidate) => {
        const transaction = await candidate.getNextCrudTransaction();
        if (transaction) throw new Error("Seed account produced local writes");
      },
    };
    database = new PowerSyncDatabase({
      schema,
      database: { dbFilename: path.basename(databasePath), dbLocation: path.dirname(databasePath) },
    });
    await database.init();
    await database.connect(connector);
    await database.waitForFirstSync();
    await verifyCatalog(database);
    await database.execute("DELETE FROM ps_kv WHERE key = ?", ["client_id"]);
    const escapedPath = snapshotPath.replaceAll("'", "''");
    await database.execute(`VACUUM INTO '${escapedPath}'`);
    await database.close();
    database = undefined;

    const file = await readFile(snapshotPath);
    const checksum = createHash("sha256").update(file).digest("hex");
    const size = (await stat(snapshotPath)).size;
    const version = `${Date.now()}-${checksum.slice(0, 12)}`;
    const objectKey = `${seedEnvironment}/${version}.sqlite`;
    const manifest = manifestFor(version, objectKey, checksum, size);
    const existing = await getLatestManifest(storage, seedEnvironment);
    // Versions are `${Date.now()}-${checksum-prefix}`; refuse to replace a newer or
    // identical latest manifest with an older snapshot (e.g. a stale re-publish).
    if (existing) {
      const existingTimestamp = Number(existing.version.split("-")[0]);
      const newTimestamp = Number(version.split("-")[0]);
      if (!Number.isFinite(existingTimestamp) || newTimestamp <= existingTimestamp) {
        throw new Error(`Refusing to publish ${version} over existing latest ${existing.version}`);
      }
    }
    await storage.putFile({ key: objectKey, body: file, contentType: CONTENT_TYPES.sqlite });
    await storage.putJson({
      key: `${seedEnvironment}/latest.json`,
      value: manifest,
      cacheControl: "no-cache",
    });
    console.log(`Published PowerSync seed ${version} (${size} bytes) to ${seedEnvironment}`);
  } finally {
    if (database) await database.close().catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
}

if (import.meta.main) await main();

async function getLatestManifest(
  storage: Storage,
  seedEnvironment: string,
): Promise<{ version: string } | undefined> {
  const manifest = await storage.getJson(`${seedEnvironment}/latest.json`);
  if (!manifest || typeof manifest !== "object") return undefined;
  const version = "version" in manifest ? manifest.version : undefined;
  return typeof version === "string" && version.length > 0 ? { version } : undefined;
}
