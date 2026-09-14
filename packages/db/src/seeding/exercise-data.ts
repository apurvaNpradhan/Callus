import { readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

const dataPath = path.resolve(import.meta.dirname, "../data/exercises");
const trimmedText = z.string().transform((value) => value.trim());
const nonEmptyText = trimmedText.pipe(z.string().min(1));
const id = trimmedText.pipe(z.string().regex(/^\d+$/u));
const timestamp = trimmedText.pipe(z.iso.datetime({ offset: true }));

const bodyPartsSchema = z.array(z.object({ id, name: nonEmptyText }).strict());
const equipmentSchema = z.array(z.object({ id, name: nonEmptyText }).strict());
const musclesSchema = z.array(z.object({ id, name: nonEmptyText }).strict());
const exercisesSchema = z.array(
  z
    .object({
      created_at: timestamp,
      exercise_type: z.enum(["weight_reps", "duration", "distance_duration"]),
      id,
      image_key: nonEmptyText.nullable(),
      instructions: nonEmptyText.nullable(),
      name: nonEmptyText,
      updated_at: timestamp,
      video_key: nonEmptyText.nullable(),
    })
    .strict(),
);

const exerciseToBodyPartsSchema = z.array(
  z
    .object({
      body_part_id: id,
      exercise_id: id,
      id: trimmedText.pipe(z.string().regex(/^\d+:\d+$/u)),
    })
    .strict(),
);
const exerciseToEquipmentSchema = z.array(
  z
    .object({
      equipment_id: id,
      exercise_id: id,
      id: trimmedText.pipe(z.string().regex(/^\d+:\d+$/u)),
    })
    .strict(),
);
const exerciseToMusclesSchema = z.array(
  z
    .object({
      exercise_id: id,
      id: trimmedText.pipe(z.string().regex(/^\d+:\d+$/u)),
      is_primary: z.boolean(),
      muscle_id: id,
    })
    .strict(),
);

const readJson = <T>(filename: string, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readFileSync(path.join(dataPath, filename), "utf8")));

const assertUnique = (values: string[], label: string) => {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
};

const assertReferences = (values: string[], available: Set<string>, label: string) => {
  for (const value of values) {
    if (!available.has(value)) throw new Error(`Unknown ${label}: ${value}`);
  }
};

export const loadExerciseData = () => {
  const bodyParts = readJson("body_part.json", bodyPartsSchema);
  const equipment = readJson("equipment.json", equipmentSchema);
  const muscles = readJson("muscle.json", musclesSchema);
  const exercises = readJson("exercise.json", exercisesSchema);
  const exerciseToBodyParts = readJson("exercise_to_body_part.json", exerciseToBodyPartsSchema);
  const exerciseToEquipment = readJson("exercise_to_equipment.json", exerciseToEquipmentSchema);
  const exerciseToMuscles = readJson("exercise_to_muscle.json", exerciseToMusclesSchema);

  assertUnique(
    bodyParts.map(({ id }) => id),
    "body part ID",
  );
  assertUnique(
    equipment.map(({ id }) => id),
    "equipment ID",
  );
  assertUnique(
    muscles.map(({ id }) => id),
    "muscle ID",
  );
  assertUnique(
    exercises.map(({ id }) => id),
    "exercise ID",
  );
  assertUnique(
    exerciseToBodyParts.map(({ id }) => id),
    "exercise-to-body-part ID",
  );
  assertUnique(
    exerciseToEquipment.map(({ id }) => id),
    "exercise-to-equipment ID",
  );
  assertUnique(
    exerciseToMuscles.map(({ id }) => id),
    "exercise-to-muscle ID",
  );

  const exerciseIds = new Set(exercises.map(({ id }) => id));
  const bodyPartIds = new Set(bodyParts.map(({ id }) => id));
  const equipmentIds = new Set(equipment.map(({ id }) => id));
  const muscleIds = new Set(muscles.map(({ id }) => id));

  assertReferences(
    exerciseToBodyParts.map(({ exercise_id }) => exercise_id),
    exerciseIds,
    "exercise_to_body_part exercise",
  );
  assertReferences(
    exerciseToBodyParts.map(({ body_part_id }) => body_part_id),
    bodyPartIds,
    "exercise_to_body_part body part",
  );
  assertReferences(
    exerciseToEquipment.map(({ exercise_id }) => exercise_id),
    exerciseIds,
    "exercise_to_equipment exercise",
  );
  assertReferences(
    exerciseToEquipment.map(({ equipment_id }) => equipment_id),
    equipmentIds,
    "exercise_to_equipment equipment",
  );
  assertReferences(
    exerciseToMuscles.map(({ exercise_id }) => exercise_id),
    exerciseIds,
    "exercise_to_muscle exercise",
  );
  assertReferences(
    exerciseToMuscles.map(({ muscle_id }) => muscle_id),
    muscleIds,
    "exercise_to_muscle muscle",
  );

  for (const row of exerciseToBodyParts) {
    if (row.id !== `${row.exercise_id}:${row.body_part_id}`) {
      throw new Error(`Invalid exercise_to_body_part ID: ${row.id}`);
    }
  }
  for (const row of exerciseToEquipment) {
    if (row.id !== `${row.exercise_id}:${row.equipment_id}`) {
      throw new Error(`Invalid exercise_to_equipment ID: ${row.id}`);
    }
  }
  for (const row of exerciseToMuscles) {
    if (row.id !== `${row.exercise_id}:${row.muscle_id}`) {
      throw new Error(`Invalid exercise_to_muscle ID: ${row.id}`);
    }
  }

  const bodyPartsByExercise = new Set(exerciseToBodyParts.map(({ exercise_id }) => exercise_id));
  const equipmentByExercise = new Set(exerciseToEquipment.map(({ exercise_id }) => exercise_id));
  for (const row of exercises) {
    if (!bodyPartsByExercise.has(row.id)) throw new Error(`Exercise has no body part: ${row.id}`);
    if (!equipmentByExercise.has(row.id)) throw new Error(`Exercise has no equipment: ${row.id}`);
  }

  return {
    bodyParts,
    equipment,
    exerciseToBodyParts,
    exerciseToEquipment,
    exerciseToMuscles,
    exercises,
    muscles,
  };
};

export type ExerciseSeedData = ReturnType<typeof loadExerciseData>;
