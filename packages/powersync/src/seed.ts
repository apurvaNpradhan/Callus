import { z } from "zod";

import { env } from "@callus/env/server";
import { createStorageFromEnv, type Storage } from "@callus/storage";

const manifestSchema = z
  .object({
    version: z.string().regex(/^[A-Za-z0-9._-]{1,80}$/u),
    objectKey: z.string().regex(/^[a-z]+\/[A-Za-z0-9._/-]+\.sqlite$/u),
    checksum: z.string().regex(/^[a-f0-9]{64}$/iu),
    size: z.number().int().positive().refine(Number.isSafeInteger),
    schemaVersion: z.number().int().positive().refine(Number.isSafeInteger),
    catalogCounts: z
      .object({
        exercises: z.number().int().nonnegative().refine(Number.isSafeInteger),
        bodyPartLinks: z.number().int().nonnegative().refine(Number.isSafeInteger),
        equipmentLinks: z.number().int().nonnegative().refine(Number.isSafeInteger),
        muscleLinks: z.number().int().nonnegative().refine(Number.isSafeInteger),
      })
      .strict(),
  })
  .strict();
const expectedCatalogCounts = {
  exercises: 7542,
  bodyPartLinks: 8786,
  equipmentLinks: 7561,
  muscleLinks: 35358,
};

export type ExerciseSeedManifest = {
  version: string;
  objectKey: string;
  checksum: string;
  size: number;
  schemaVersion: number;
  catalogCounts: {
    exercises: number;
    bodyPartLinks: number;
    equipmentLinks: number;
    muscleLinks: number;
  };
};

let storage: Storage | undefined;

function getStorage() {
  storage ??= createStorageFromEnv(env);
  return storage;
}

export function validateManifest(value: unknown): ExerciseSeedManifest {
  const parsed = manifestSchema.safeParse(value);
  if (!parsed.success) throw new Error("Seed manifest is invalid");
  const manifest = parsed.data;
  if (manifest.objectKey !== `${env.POWERSYNC_SEED_ENV}/${manifest.version}.sqlite`)
    throw new Error("Seed manifest object key is invalid");
  if (
    manifest.catalogCounts.exercises !== expectedCatalogCounts.exercises ||
    manifest.catalogCounts.bodyPartLinks !== expectedCatalogCounts.bodyPartLinks ||
    manifest.catalogCounts.equipmentLinks !== expectedCatalogCounts.equipmentLinks ||
    manifest.catalogCounts.muscleLinks !== expectedCatalogCounts.muscleLinks
  )
    throw new Error("Seed manifest catalog counts are invalid");
  return manifest;
}

export async function getLatestSeedManifest() {
  let value: unknown;
  try {
    value = await getStorage().getJson(`${env.POWERSYNC_SEED_ENV}/latest.json`);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error("Seed manifest is not valid JSON");
  }
  if (value === undefined) throw new Error("Seed manifest is empty");
  const manifest = validateManifest(value);
  return manifest;
}

export async function getLatestSeedDownload() {
  const manifest = await getLatestSeedManifest();
  const url = await getStorage().signedDownloadUrl({ key: manifest.objectKey, expiresIn: 300 });
  return { ...manifest, url };
}
