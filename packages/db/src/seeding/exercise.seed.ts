// oxlint-disable import/no-relative-parent-imports
import { and, inArray, isNull, sql } from "drizzle-orm";

// oxlint-disable-next-line import/no-relative-parent-imports
import { db } from "../index";
// oxlint-disable-next-line import/no-relative-parent-imports
import {
  bodyPart,
  equipment,
  exercise,
  exerciseToBodyPart,
  exerciseToEquipment,
  exerciseToMuscle,
  muscle,
} from "../schema";
import { loadExerciseData, type ExerciseSeedData } from "./exercise-data";

const chunks = function* <T>(rows: readonly T[], size: number) {
  for (let offset = 0; offset < rows.length; offset += size)
    yield rows.slice(offset, offset + size);
};

const staleIds = (actual: readonly string[], expected: ReadonlySet<string>) =>
  actual.filter((id) => !expected.has(id));

class StaleExerciseSeedRowsError extends Error {
  constructor(readonly report: Record<string, string[]>) {
    super(
      Object.entries(report)
        .filter(([, ids]) => ids.length > 0)
        .map(([table, ids]) => `${table}: ${ids.join(", ")}`)
        .join("\n"),
    );
    this.name = "StaleExerciseSeedRowsError";
  }
}

async function findStaleRows(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  data: ExerciseSeedData,
) {
  const expected = {
    bodyPart: new Set(data.bodyParts.map(({ id }) => id)),
    equipment: new Set(data.equipment.map(({ id }) => id)),
    exercise: new Set(data.exercises.map(({ id }) => id)),
    exerciseToBodyPart: new Set(data.exerciseToBodyParts.map(({ id }) => id)),
    exerciseToEquipment: new Set(data.exerciseToEquipment.map(({ id }) => id)),
    exerciseToMuscle: new Set(data.exerciseToMuscles.map(({ id }) => id)),
    muscle: new Set(data.muscles.map(({ id }) => id)),
  };
  const systemExercises = await tx
    .select({ id: exercise.id })
    .from(exercise)
    .where(isNull(exercise.userId));
  const systemExerciseIds = new Set(systemExercises.map(({ id }) => id));
  const bodyParts = await tx.select({ id: bodyPart.id }).from(bodyPart);
  const equipmentRows = await tx.select({ id: equipment.id }).from(equipment);
  const muscles = await tx.select({ id: muscle.id }).from(muscle);
  const exercises = await tx
    .select({ id: exercise.id })
    .from(exercise)
    .where(isNull(exercise.userId));
  const bodyLinks = await tx
    .select({ id: exerciseToBodyPart.id, exerciseId: exerciseToBodyPart.exerciseId })
    .from(exerciseToBodyPart);
  const equipmentLinks = await tx
    .select({ id: exerciseToEquipment.id, exerciseId: exerciseToEquipment.exerciseId })
    .from(exerciseToEquipment);
  const muscleLinks = await tx
    .select({ id: exerciseToMuscle.id, exerciseId: exerciseToMuscle.exerciseId })
    .from(exerciseToMuscle);
  return {
    bodyPart: staleIds(
      bodyParts.map(({ id }) => id),
      expected.bodyPart,
    ),
    equipment: staleIds(
      equipmentRows.map(({ id }) => id),
      expected.equipment,
    ),
    exercise: staleIds(
      exercises.map(({ id }) => id),
      expected.exercise,
    ),
    exerciseToBodyPart: staleIds(
      bodyLinks.filter(({ exerciseId }) => systemExerciseIds.has(exerciseId)).map(({ id }) => id),
      expected.exerciseToBodyPart,
    ),
    exerciseToEquipment: staleIds(
      equipmentLinks
        .filter(({ exerciseId }) => systemExerciseIds.has(exerciseId))
        .map(({ id }) => id),
      expected.exerciseToEquipment,
    ),
    exerciseToMuscle: staleIds(
      muscleLinks.filter(({ exerciseId }) => systemExerciseIds.has(exerciseId)).map(({ id }) => id),
      expected.exerciseToMuscle,
    ),
    muscle: staleIds(
      muscles.map(({ id }) => id),
      expected.muscle,
    ),
  };
}

const deleteChunks = async <T extends string>(
  ids: readonly T[],
  deleteRows: (ids: readonly T[]) => Promise<unknown>,
) => {
  for (const chunk of chunks(ids, 500)) await deleteRows(chunk);
};

async function upsertCatalog(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  data: ExerciseSeedData,
) {
  await tx
    .insert(bodyPart)
    .values(data.bodyParts)
    .onConflictDoUpdate({
      target: bodyPart.id,
      set: { name: sql`excluded.name` },
    });
  await tx
    .insert(equipment)
    .values(data.equipment)
    .onConflictDoUpdate({
      target: equipment.id,
      set: { name: sql`excluded.name` },
    });
  await tx
    .insert(muscle)
    .values(data.muscles)
    .onConflictDoUpdate({
      target: muscle.id,
      set: { name: sql`excluded.name` },
    });

  for (const chunk of chunks(data.exercises, 500)) {
    await tx
      .insert(exercise)
      .values(
        chunk.map((row) => ({
          id: row.id,
          userId: null,
          name: row.name,
          exerciseType: row.exercise_type,
          instructions: row.instructions,
          imageKey: row.image_key,
          videoKey: row.video_key,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        })),
      )
      .onConflictDoUpdate({
        target: exercise.id,
        set: {
          name: sql`excluded.name`,
          exerciseType: sql`excluded.exercise_type`,
          instructions: sql`excluded.instructions`,
          imageKey: sql`excluded.image_key`,
          videoKey: sql`excluded.video_key`,
          updatedAt: sql`excluded.updated_at`,
        },
        setWhere: isNull(exercise.userId),
      });
  }
  for (const chunk of chunks(data.exerciseToBodyParts, 1000)) {
    await tx
      .insert(exerciseToBodyPart)
      .values(
        chunk.map((row) => ({
          id: row.id,
          exerciseId: row.exercise_id,
          bodyPartId: row.body_part_id,
        })),
      )
      .onConflictDoUpdate({
        target: exerciseToBodyPart.id,
        set: { exerciseId: sql`excluded.exercise_id`, bodyPartId: sql`excluded.body_part_id` },
      });
  }
  for (const chunk of chunks(data.exerciseToEquipment, 1000)) {
    await tx
      .insert(exerciseToEquipment)
      .values(
        chunk.map((row) => ({
          id: row.id,
          exerciseId: row.exercise_id,
          equipmentId: row.equipment_id,
        })),
      )
      .onConflictDoUpdate({
        target: exerciseToEquipment.id,
        set: { exerciseId: sql`excluded.exercise_id`, equipmentId: sql`excluded.equipment_id` },
      });
  }
  for (const chunk of chunks(data.exerciseToMuscles, 1000)) {
    await tx
      .insert(exerciseToMuscle)
      .values(
        chunk.map((row) => ({
          id: row.id,
          exerciseId: row.exercise_id,
          muscleId: row.muscle_id,
          isPrimary: row.is_primary,
        })),
      )
      .onConflictDoUpdate({
        target: exerciseToMuscle.id,
        set: {
          exerciseId: sql`excluded.exercise_id`,
          muscleId: sql`excluded.muscle_id`,
          isPrimary: sql`excluded.is_primary`,
        },
      });
  }
}

export async function seedExercises({ prune = false } = {}) {
  const data = loadExerciseData();
  await db.transaction(async (tx) => {
    const stale = await findStaleRows(tx, data);
    if (!prune && Object.values(stale).some((ids) => ids.length > 0)) {
      throw new StaleExerciseSeedRowsError(stale);
    }

    if (prune) {
      await deleteChunks(stale.exerciseToBodyPart, (ids) =>
        tx.delete(exerciseToBodyPart).where(inArray(exerciseToBodyPart.id, ids)),
      );
      await deleteChunks(stale.exerciseToEquipment, (ids) =>
        tx.delete(exerciseToEquipment).where(inArray(exerciseToEquipment.id, ids)),
      );
      await deleteChunks(stale.exerciseToMuscle, (ids) =>
        tx.delete(exerciseToMuscle).where(inArray(exerciseToMuscle.id, ids)),
      );
      await deleteChunks(stale.exercise, (ids) =>
        tx.delete(exercise).where(and(inArray(exercise.id, ids), isNull(exercise.userId))),
      );

      const customBodyPartRefs = new Set(
        (await tx.select({ id: exerciseToBodyPart.bodyPartId }).from(exerciseToBodyPart)).map(
          ({ id }) => id,
        ),
      );
      const customEquipmentRefs = new Set(
        (await tx.select({ id: exerciseToEquipment.equipmentId }).from(exerciseToEquipment)).map(
          ({ id }) => id,
        ),
      );
      const customMuscleRefs = new Set(
        (await tx.select({ id: exerciseToMuscle.muscleId }).from(exerciseToMuscle)).map(
          ({ id }) => id,
        ),
      );
      await deleteChunks(
        stale.bodyPart.filter((id) => !customBodyPartRefs.has(id)),
        (ids) => tx.delete(bodyPart).where(inArray(bodyPart.id, ids)),
      );
      await deleteChunks(
        stale.equipment.filter((id) => !customEquipmentRefs.has(id)),
        (ids) => tx.delete(equipment).where(inArray(equipment.id, ids)),
      );
      await deleteChunks(
        stale.muscle.filter((id) => !customMuscleRefs.has(id)),
        (ids) => tx.delete(muscle).where(inArray(muscle.id, ids)),
      );
    }

    await upsertCatalog(tx, data);
  });
  return data;
}

if (import.meta.main) {
  const prune = process.argv.includes("--prune");
  const data = await seedExercises({ prune });
  console.log(
    `${prune ? "Pruned and seeded" : "Seeded"} ${data.exercises.length} exercises and ${
      data.exerciseToBodyParts.length +
      data.exerciseToEquipment.length +
      data.exerciseToMuscles.length
    } relationships.`,
  );
}
