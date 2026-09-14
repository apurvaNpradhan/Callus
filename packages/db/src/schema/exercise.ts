// oxlint-disable import/no-relative-parent-imports
import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";

export type ExerciseType = "weight_reps" | "duration" | "distance_duration";

export const bodyPart = pgTable("body_part", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const equipment = pgTable("equipment", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const muscle = pgTable("muscle", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const exercise = pgTable(
  "exercise",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    exerciseType: text("exercise_type").$type<ExerciseType>().notNull(),
    instructions: text("instructions"),
    imageKey: text("image_key"),
    videoKey: text("video_key"),
    createdAt: timestamp("created_at", { precision: 3, withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { precision: 3, withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("exercise_user_id_idx").on(table.userId),
    check(
      "exercise_name_trimmed_check",
      sql`${table.name} = btrim(${table.name}) AND length(${table.name}) > 0`,
    ),
    check(
      "exercise_type_check",
      sql`${table.exerciseType} IN ('weight_reps', 'duration', 'distance_duration')`,
    ),
    check(
      "exercise_custom_id_uuid_check",
      sql`${table.userId} IS NULL OR ${table.id} ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'`,
    ),
  ],
);

export const exerciseToBodyPart = pgTable(
  "exercise_to_body_part",
  {
    id: text("id").primaryKey(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    bodyPartId: text("body_part_id")
      .notNull()
      .references(() => bodyPart.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("exercise_to_body_part_pair_uidx").on(table.exerciseId, table.bodyPartId),
    index("exercise_to_body_part_body_part_id_idx").on(table.bodyPartId),
    index("exercise_to_body_part_user_id_idx").on(table.userId),
    check(
      "exercise_to_body_part_id_check",
      sql`${table.id} = ${table.exerciseId} || ':' || ${table.bodyPartId}`,
    ),
  ],
);

export const exerciseToEquipment = pgTable(
  "exercise_to_equipment",
  {
    id: text("id").primaryKey(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    equipmentId: text("equipment_id")
      .notNull()
      .references(() => equipment.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("exercise_to_equipment_pair_uidx").on(table.exerciseId, table.equipmentId),
    index("exercise_to_equipment_equipment_id_idx").on(table.equipmentId),
    index("exercise_to_equipment_user_id_idx").on(table.userId),
    check(
      "exercise_to_equipment_id_check",
      sql`${table.id} = ${table.exerciseId} || ':' || ${table.equipmentId}`,
    ),
  ],
);

export const exerciseToMuscle = pgTable(
  "exercise_to_muscle",
  {
    id: text("id").primaryKey(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercise.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    muscleId: text("muscle_id")
      .notNull()
      .references(() => muscle.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => [
    uniqueIndex("exercise_to_muscle_pair_uidx").on(table.exerciseId, table.muscleId),
    index("exercise_to_muscle_muscle_id_idx").on(table.muscleId),
    index("exercise_to_muscle_user_id_idx").on(table.userId),
    check(
      "exercise_to_muscle_id_check",
      sql`${table.id} = ${table.exerciseId} || ':' || ${table.muscleId}`,
    ),
  ],
);
