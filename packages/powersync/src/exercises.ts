import { and, eq, inArray } from "drizzle-orm";

import type { db } from "@callus/db";
import {
  bodyPart,
  equipment,
  exercise,
  exerciseToBodyPart,
  exerciseToEquipment,
  exerciseToMuscle,
  muscle,
} from "@callus/db/exercise-schema";

import type { UploadOperation } from "./upload";

export class ExerciseUploadRejectedError extends Error {
  constructor(
    message: string,
    readonly operationIds: readonly string[],
  ) {
    super(message);
    this.name = "ExerciseUploadRejectedError";
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type RelationshipParent = { exerciseId: string; lookupId: string };
type OwnershipContext = { exerciseIds: readonly string[] };

type Reject = (message: string, operationIds?: readonly string[]) => never;

const parentIdFromLinkId = (id: string): RelationshipParent | undefined => {
  const separator = id.indexOf(":");
  if (separator <= 0 || separator === id.length - 1) return undefined;
  return { exerciseId: id.slice(0, separator), lookupId: id.slice(separator + 1) };
};

async function validateOwnershipAndRelationships(
  tx: DatabaseTransaction,
  userId: string,
  operations: readonly UploadOperation[],
  reject: Reject,
): Promise<OwnershipContext> {
  const parentIds = new Set<string>();
  for (const operation of operations) {
    if (operation.table === "exercise") parentIds.add(operation.id);
    else {
      const parent = parentIdFromLinkId(operation.id);
      if (parent) parentIds.add(parent.exerciseId);
    }
  }
  const exerciseIds = [...parentIds];
  const existing = exerciseIds.length
    ? await tx.select().from(exercise).where(inArray(exercise.id, exerciseIds))
    : [];
  const existingById = new Map(existing.map((row) => [row.id, row]));
  const newExerciseIds = new Set(
    operations
      .filter((operation) => operation.table === "exercise" && operation.op === "PUT")
      .filter((operation) => !existingById.has(operation.id))
      .map((operation) => operation.id),
  );
  const deletedExerciseIds = new Set(
    operations
      .filter((operation) => operation.table === "exercise" && operation.op === "DELETE")
      .map((operation) => operation.id),
  );

  for (const operation of operations) {
    if (operation.table === "exercise") {
      const row = existingById.get(operation.id);
      if (operation.op === "PUT") {
        if (
          !uuidPattern.test(operation.id) ||
          (row && (row.userId === null || row.userId !== userId))
        ) {
          reject("Only an owned custom exercise may be written");
        }
      } else if (!row || row.userId !== userId) {
        reject("Exercise was not found or is read-only", [operation.id]);
      }
      continue;
    }

    const parent = parentIdFromLinkId(operation.id);
    if (!parent) {
      reject("Relationship ID is not deterministic", [operation.id]);
      continue;
    }
    if (deletedExerciseIds.has(parent.exerciseId)) {
      if (operation.op === "DELETE") continue;
      reject("A deleted exercise cannot receive relationship writes", [operation.id]);
    }
    const parentRow = existingById.get(parent.exerciseId);
    if ((!parentRow || parentRow.userId !== userId) && !newExerciseIds.has(parent.exerciseId)) {
      reject("Relationship parent is not an owned custom exercise", [operation.id]);
    }
    if (operation.op === "DELETE") continue;

    const data = operation.opData;
    if (data.exercise_id !== undefined && data.exercise_id !== parent.exerciseId) {
      reject("Relationship parent does not match its ID", [operation.id]);
    }
    const lookupId =
      "body_part_id" in data
        ? data.body_part_id
        : "equipment_id" in data
          ? data.equipment_id
          : "muscle_id" in data
            ? data.muscle_id
            : undefined;
    if (lookupId !== undefined && lookupId !== parent.lookupId) {
      reject("Relationship lookup does not match its ID", [operation.id]);
    }
  }

  return { exerciseIds };
}

async function validateLookups(
  tx: DatabaseTransaction,
  operations: readonly UploadOperation[],
  reject: Reject,
) {
  const bodyPartIds = new Set<string>();
  const equipmentIds = new Set<string>();
  const muscleIds = new Set<string>();
  for (const operation of operations) {
    if (operation.op === "DELETE" || operation.table === "exercise") continue;
    if (operation.table === "exercise_to_body_part" && operation.opData.body_part_id !== undefined)
      bodyPartIds.add(operation.opData.body_part_id);
    if (operation.table === "exercise_to_equipment" && operation.opData.equipment_id !== undefined)
      equipmentIds.add(operation.opData.equipment_id);
    if (operation.table === "exercise_to_muscle" && operation.opData.muscle_id !== undefined)
      muscleIds.add(operation.opData.muscle_id);
  }

  const bodyPartRows = bodyPartIds.size
    ? await tx
        .select({ id: bodyPart.id })
        .from(bodyPart)
        .where(inArray(bodyPart.id, [...bodyPartIds]))
    : [];
  const equipmentRows = equipmentIds.size
    ? await tx
        .select({ id: equipment.id })
        .from(equipment)
        .where(inArray(equipment.id, [...equipmentIds]))
    : [];
  const muscleRows = muscleIds.size
    ? await tx
        .select({ id: muscle.id })
        .from(muscle)
        .where(inArray(muscle.id, [...muscleIds]))
    : [];
  if (bodyPartRows.length !== bodyPartIds.size) reject("Unknown body part lookup");
  if (equipmentRows.length !== equipmentIds.size) reject("Unknown equipment lookup");
  if (muscleRows.length !== muscleIds.size) reject("Unknown muscle lookup");
}

async function writeExercise(
  tx: DatabaseTransaction,
  userId: string,
  operation: Extract<UploadOperation, { table: "exercise" }>,
) {
  const now = new Date();
  if (operation.op === "PUT") {
    await tx
      .insert(exercise)
      .values({
        id: operation.id,
        userId,
        name: operation.opData.name,
        exerciseType: operation.opData.exercise_type,
        instructions: operation.opData.instructions ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: exercise.id,
        set: {
          name: operation.opData.name,
          exerciseType: operation.opData.exercise_type,
          instructions: operation.opData.instructions ?? null,
          updatedAt: now,
        },
        setWhere: eq(exercise.userId, userId),
      });
  } else if (operation.op === "PATCH") {
    const values: Partial<typeof exercise.$inferInsert> = { updatedAt: now };
    if (operation.opData.name !== undefined) values.name = operation.opData.name;
    if (operation.opData.exercise_type !== undefined)
      values.exerciseType = operation.opData.exercise_type;
    if (operation.opData.instructions !== undefined)
      values.instructions = operation.opData.instructions;
    await tx
      .update(exercise)
      .set(values)
      .where(and(eq(exercise.id, operation.id), eq(exercise.userId, userId)));
  } else {
    await tx
      .delete(exercise)
      .where(and(eq(exercise.id, operation.id), eq(exercise.userId, userId)));
  }
}

async function writeRelationship(
  tx: DatabaseTransaction,
  operation: Exclude<UploadOperation, { table: "exercise" }>,
  reject: Reject,
) {
  const parent = parentIdFromLinkId(operation.id);
  if (!parent) {
    reject("Relationship ID is not deterministic", [operation.id]);
    return;
  }

  if (operation.table === "exercise_to_body_part") {
    if (operation.op === "PUT") {
      await tx
        .insert(exerciseToBodyPart)
        .values({ id: operation.id, exerciseId: parent.exerciseId, bodyPartId: parent.lookupId })
        .onConflictDoUpdate({
          target: exerciseToBodyPart.id,
          set: { exerciseId: parent.exerciseId, bodyPartId: parent.lookupId },
        });
    } else if (operation.op === "PATCH") {
      await tx
        .update(exerciseToBodyPart)
        .set({ exerciseId: parent.exerciseId, bodyPartId: parent.lookupId })
        .where(eq(exerciseToBodyPart.id, operation.id));
    } else {
      await tx.delete(exerciseToBodyPart).where(eq(exerciseToBodyPart.id, operation.id));
    }
  } else if (operation.table === "exercise_to_equipment") {
    if (operation.op === "PUT") {
      await tx
        .insert(exerciseToEquipment)
        .values({ id: operation.id, exerciseId: parent.exerciseId, equipmentId: parent.lookupId })
        .onConflictDoUpdate({
          target: exerciseToEquipment.id,
          set: { exerciseId: parent.exerciseId, equipmentId: parent.lookupId },
        });
    } else if (operation.op === "PATCH") {
      await tx
        .update(exerciseToEquipment)
        .set({ exerciseId: parent.exerciseId, equipmentId: parent.lookupId })
        .where(eq(exerciseToEquipment.id, operation.id));
    } else {
      await tx.delete(exerciseToEquipment).where(eq(exerciseToEquipment.id, operation.id));
    }
  } else if (operation.op === "PUT") {
    await tx
      .insert(exerciseToMuscle)
      .values({
        id: operation.id,
        exerciseId: parent.exerciseId,
        muscleId: parent.lookupId,
        isPrimary: operation.opData.is_primary,
      })
      .onConflictDoUpdate({
        target: exerciseToMuscle.id,
        set: {
          exerciseId: parent.exerciseId,
          muscleId: parent.lookupId,
          isPrimary: operation.opData.is_primary,
        },
      });
  } else if (operation.op === "PATCH") {
    await tx
      .update(exerciseToMuscle)
      .set({
        exerciseId: parent.exerciseId,
        muscleId: parent.lookupId,
        ...(operation.opData.is_primary === undefined
          ? {}
          : { isPrimary: operation.opData.is_primary }),
      })
      .where(eq(exerciseToMuscle.id, operation.id));
  } else {
    await tx.delete(exerciseToMuscle).where(eq(exerciseToMuscle.id, operation.id));
  }
}

async function validateFinalExerciseInvariant(
  tx: DatabaseTransaction,
  userId: string,
  exerciseIds: readonly string[],
  reject: Reject,
) {
  const finalExercises = exerciseIds.length
    ? await tx
        .select({ id: exercise.id })
        .from(exercise)
        .where(and(inArray(exercise.id, exerciseIds), eq(exercise.userId, userId)))
    : [];
  const finalIds = finalExercises.map(({ id }) => id);
  if (!finalIds.length) return;

  const bodyLinks = await tx
    .select({ exerciseId: exerciseToBodyPart.exerciseId })
    .from(exerciseToBodyPart)
    .where(inArray(exerciseToBodyPart.exerciseId, finalIds));
  const equipmentLinks = await tx
    .select({ exerciseId: exerciseToEquipment.exerciseId })
    .from(exerciseToEquipment)
    .where(inArray(exerciseToEquipment.exerciseId, finalIds));
  const bodyIds = new Set(bodyLinks.map(({ exerciseId }) => exerciseId));
  const equipmentIds = new Set(equipmentLinks.map(({ exerciseId }) => exerciseId));
  const invalid = finalIds.filter((id) => !bodyIds.has(id) || !equipmentIds.has(id));
  if (invalid.length) reject("Custom exercises require a body part and equipment", invalid);
}

export async function applyExerciseOperations(
  tx: DatabaseTransaction,
  userId: string,
  operations: readonly UploadOperation[],
) {
  const reject: Reject = (message, operationIds = operations.map(({ id }) => id)): never => {
    throw new ExerciseUploadRejectedError(message, operationIds);
  };
  const ownership = await validateOwnershipAndRelationships(tx, userId, operations, reject);
  await validateLookups(tx, operations, reject);

  const orderedOperations = [...operations].sort(
    (left, right) => Number(left.table !== "exercise") - Number(right.table !== "exercise"),
  );
  for (const operation of orderedOperations) {
    if (operation.table === "exercise") await writeExercise(tx, userId, operation);
    else await writeRelationship(tx, operation, reject);
  }

  await validateFinalExerciseInvariant(tx, userId, ownership.exerciseIds, reject);
}
