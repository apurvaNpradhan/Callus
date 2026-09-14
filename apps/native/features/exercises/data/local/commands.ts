import { and, eq } from "drizzle-orm";
import { randomUUID } from "expo-crypto";

import {
  exerciseTable,
  exerciseToBodyPartTable,
  exerciseToEquipmentTable,
  exerciseToMuscleTable,
} from "@/features/exercises/schema";
import { drizzleDb } from "@/lib/powersync/database";

import type { NativeExerciseType } from "./queries";

export type SaveExerciseInput = {
  id?: string;
  name: string;
  exerciseType: NativeExerciseType;
  instructions?: string | null;
  bodyPartIds: readonly string[];
  equipmentIds: readonly string[];
  muscleIds?: readonly { id: string; isPrimary?: boolean }[];
};

const unique = (values: readonly string[]) => [
  ...new Set(values.map((value) => value.trim()).filter(Boolean)),
];

export async function saveExercise(userId: string, input: SaveExerciseInput) {
  const name = input.name.trim();
  const bodyPartIds = unique(input.bodyPartIds);
  const equipmentIds = unique(input.equipmentIds);
  const muscleIds = [
    ...new Map(
      (input.muscleIds ?? [])
        .map(({ id, isPrimary = false }) => [id.trim(), { id: id.trim(), isPrimary }] as const)
        .filter(([id]) => id),
    ).values(),
  ];
  if (!name) throw new Error("Exercise name is required");
  if (!bodyPartIds.length || !equipmentIds.length)
    throw new Error("Custom exercises require a body part and equipment");
  const id = input.id ?? randomUUID();
  const now = new Date().toISOString();

  await drizzleDb.transaction(async (tx) => {
    const current = await tx
      .select({ userId: exerciseTable.userId })
      .from(exerciseTable)
      .where(eq(exerciseTable.id, id))
      .get();
    if (current && current.userId !== userId) throw new Error("Exercise is read-only");
    await tx
      .insert(exerciseTable)
      .values({
        id,
        userId,
        name,
        exerciseType: input.exerciseType,
        instructions: input.instructions?.trim() || null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: exerciseTable.id,
        set: {
          name,
          exerciseType: input.exerciseType,
          instructions: input.instructions?.trim() || null,
          updatedAt: now,
        },
      });
    await tx.delete(exerciseToBodyPartTable).where(eq(exerciseToBodyPartTable.exerciseId, id));
    await tx.delete(exerciseToEquipmentTable).where(eq(exerciseToEquipmentTable.exerciseId, id));
    await tx.delete(exerciseToMuscleTable).where(eq(exerciseToMuscleTable.exerciseId, id));
    await tx.insert(exerciseToBodyPartTable).values(
      bodyPartIds.map((lookupId) => ({
        id: `${id}:${lookupId}`,
        exerciseId: id,
        bodyPartId: lookupId,
      })),
    );
    await tx.insert(exerciseToEquipmentTable).values(
      equipmentIds.map((lookupId) => ({
        id: `${id}:${lookupId}`,
        exerciseId: id,
        equipmentId: lookupId,
      })),
    );
    if (muscleIds.length) {
      await tx.insert(exerciseToMuscleTable).values(
        muscleIds.map(({ id: lookupId, isPrimary }) => ({
          id: `${id}:${lookupId}`,
          exerciseId: id,
          muscleId: lookupId,
          isPrimary,
        })),
      );
    }
  });
  return id;
}

export async function deleteExercise(userId: string, id: string) {
  return drizzleDb.transaction(async (tx) => {
    const owned = await tx
      .select({ userId: exerciseTable.userId })
      .from(exerciseTable)
      .where(eq(exerciseTable.id, id))
      .get();
    if (!owned || owned.userId !== userId) return;
    // SQLite has no FK cascade here; remove links before the exercise in one transaction.
    await tx.delete(exerciseToBodyPartTable).where(eq(exerciseToBodyPartTable.exerciseId, id));
    await tx.delete(exerciseToEquipmentTable).where(eq(exerciseToEquipmentTable.exerciseId, id));
    await tx.delete(exerciseToMuscleTable).where(eq(exerciseToMuscleTable.exerciseId, id));
    await tx
      .delete(exerciseTable)
      .where(and(eq(exerciseTable.id, id), eq(exerciseTable.userId, userId)));
  });
}
