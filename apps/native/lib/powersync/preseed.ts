import { PowerSyncDatabase } from "@powersync/react-native";
import { CryptoDigestAlgorithm, digest, randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { serverUrl } from "@/lib/server-url";

import { nativeDatabaseLocation } from "./database";
import { AppSchema } from "./schema";

const catalogCounts = {
  exercises: 7542,
  bodyParts: 20,
  equipment: 28,
  muscles: 44,
  bodyPartLinks: 8786,
  equipmentLinks: 7561,
  muscleLinks: 35358,
};
const manifestSchema = z.object({
  url: z.url(),
  version: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/u),
  objectKey: z.string().regex(/^[a-z]+\/[A-Za-z0-9._/-]+\.sqlite$/u),
  checksum: z.string().regex(/^[a-f0-9]{64}$/iu),
  size: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  catalogCounts: z.object({
    exercises: z.number().int(),
    bodyParts: z.number().int(),
    equipment: z.number().int(),
    muscles: z.number().int(),
    bodyPartLinks: z.number().int(),
    equipmentLinks: z.number().int(),
    muscleLinks: z.number().int(),
  }),
});

const hexDigest = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

async function fetchManifest() {
  const cookie = await authClient.getCookie();
  const response = await expoFetch(`${serverUrl}/powersync/seed`, {
    headers: cookie ? { Cookie: cookie } : undefined,
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`Seed manifest failed (${response.status})`);
  const manifest = manifestSchema.parse(await response.json());
  const environment = manifest.objectKey.split("/", 1)[0];
  if (!environment || !["development", "staging", "production"].includes(environment)) {
    throw new Error("Seed manifest environment is invalid");
  }
  if (manifest.objectKey !== `${environment}/${manifest.version}.sqlite`)
    throw new Error("Seed manifest object key is invalid");
  if (JSON.stringify(manifest.catalogCounts) !== JSON.stringify(catalogCounts))
    throw new Error("Seed catalog counts are invalid");
  return manifest;
}

async function verifyDatabase(file: File) {
  const database = new PowerSyncDatabase({
    schema: AppSchema,
    database: { dbFilename: file.name, dbLocation: nativeDatabaseLocation },
  });
  try {
    await database.init();
    const count = async (table: string) =>
      (await database.get<{ count: number }>(`SELECT count(*) AS count FROM ${table}`)).count;
    const actual = {
      exercises: await count("exercise"),
      bodyParts: await count("body_part"),
      equipment: await count("equipment"),
      muscles: await count("muscle"),
      bodyPartLinks: await count("exercise_to_body_part"),
      equipmentLinks: await count("exercise_to_equipment"),
      muscleLinks: await count("exercise_to_muscle"),
    };
    if (JSON.stringify(actual) !== JSON.stringify(catalogCounts))
      throw new Error("Seed SQLite catalog counts are invalid");
    if (
      (
        await database.get<{ count: number }>(
          "SELECT count(*) AS count FROM exercise WHERE user_id IS NOT NULL",
        )
      ).count !== 0
    ) {
      throw new Error("Seed SQLite contains user-owned exercises");
    }
    await database.execute("DELETE FROM ps_kv WHERE key = ?", ["client_id"]);
  } finally {
    await database.close({ disconnect: false });
  }
}

export async function preparePreseededDatabase() {
  if (Platform.OS === "web") return;
  const target = new File(Paths.document, "callus.db");
  if (target.exists) return;
  let temporary: File | undefined;
  try {
    const manifest = await fetchManifest();
    temporary = new File(new Directory(Paths.document), `callus.seed.${randomUUID()}.db`);
    await File.downloadFileAsync(manifest.url, temporary);
    const info = temporary.info();
    if (!info.exists || info.size !== manifest.size)
      throw new Error("Downloaded seed size is invalid");
    const checksum = hexDigest(await digest(CryptoDigestAlgorithm.SHA256, await temporary.bytes()));
    if (checksum.toLowerCase() !== manifest.checksum.toLowerCase())
      throw new Error("Downloaded seed checksum is invalid");
    await verifyDatabase(temporary);
    if (!target.exists) await temporary.move(target);
  } catch {
    if (temporary?.exists) temporary.delete();
    console.log("PowerSync preseed unavailable; using an empty local database");
  }
}
