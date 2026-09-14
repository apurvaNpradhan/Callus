import { toCompilableQuery } from "@powersync/drizzle-driver";
import { eq, like } from "drizzle-orm";

import { drizzleDb } from "@/lib/powersync/database";

import { exerciseTable, type Exercise } from "./schema";

export type NativeExerciseType = "weight_reps" | "duration" | "distance_duration";
export type ExerciseListRow = Pick<
  Exercise,
  "id" | "userId" | "name" | "exerciseType" | "imageKey" | "videoKey"
> & {
  bodyPartLinks: { bodyPartId: string }[];
};

export function exercisesQuery(search = "") {
  const trimmed = search.trim();
  return toCompilableQuery(
    drizzleDb.query.exercise.findMany({
      columns: {
        id: true,
        userId: true,
        name: true,
        exerciseType: true,
        imageKey: true,
        videoKey: true,
      },
      with: {
        bodyPartLinks: { columns: { bodyPartId: true } },
      },
      ...(trimmed ? { where: like(exerciseTable.name, `%${trimmed}%`) } : {}),
    }),
  );
}

export function exerciseDetailQuery(id: string) {
  return toCompilableQuery(
    drizzleDb.query.exercise.findFirst({
      where: eq(exerciseTable.id, id),
      with: {
        bodyPartLinks: { columns: { bodyPartId: true } },
        equipmentLinks: { columns: { equipmentId: true } },
        muscleLinks: { columns: { muscleId: true, isPrimary: true } },
      },
    }),
  );
}

export type ExerciseDetail = Awaited<ReturnType<typeof drizzleDb.query.exercise.findFirst>>;
