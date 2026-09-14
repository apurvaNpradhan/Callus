import { toPowerSyncTable } from "@powersync/drizzle-driver";
import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const bodyPartTable = sqliteTable("body_part", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
});

export const equipmentTable = sqliteTable("equipment", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
});

export const muscleTable = sqliteTable("muscle", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
});

export const exerciseTable = sqliteTable(
  "exercise",
  {
    id: text("id").primaryKey().notNull(),
    userId: text("user_id"),
    name: text("name").notNull(),
    exerciseType: text("exercise_type").notNull(),
    instructions: text("instructions"),
    imageKey: text("image_key"),
    videoKey: text("video_key"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("exercise_by_user").on(table.userId), index("exercise_by_name").on(table.name)],
);

export const exerciseToBodyPartTable = sqliteTable(
  "exercise_to_body_part",
  {
    id: text("id").primaryKey().notNull(),
    exerciseId: text("exercise_id").notNull(),
    bodyPartId: text("body_part_id").notNull(),
  },
  (table) => [
    uniqueIndex("exercise_to_body_part_pair").on(table.exerciseId, table.bodyPartId),
    index("exercise_to_body_part_by_exercise").on(table.exerciseId),
  ],
);
export const exerciseToEquipmentTable = sqliteTable(
  "exercise_to_equipment",
  {
    id: text("id").primaryKey().notNull(),
    exerciseId: text("exercise_id").notNull(),
    equipmentId: text("equipment_id").notNull(),
  },
  (table) => [
    uniqueIndex("exercise_to_equipment_pair").on(table.exerciseId, table.equipmentId),
    index("exercise_to_equipment_by_exercise").on(table.exerciseId),
  ],
);
export const exerciseToMuscleTable = sqliteTable(
  "exercise_to_muscle",
  {
    id: text("id").primaryKey().notNull(),
    exerciseId: text("exercise_id").notNull(),
    muscleId: text("muscle_id").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull(),
  },
  (table) => [
    uniqueIndex("exercise_to_muscle_pair").on(table.exerciseId, table.muscleId),
    index("exercise_to_muscle_by_exercise").on(table.exerciseId),
  ],
);

export const exerciseRelations = relations(exerciseTable, ({ many }) => ({
  bodyPartLinks: many(exerciseToBodyPartTable),
  equipmentLinks: many(exerciseToEquipmentTable),
  muscleLinks: many(exerciseToMuscleTable),
}));
export const exerciseToBodyPartRelations = relations(exerciseToBodyPartTable, ({ one }) => ({
  exercise: one(exerciseTable, {
    fields: [exerciseToBodyPartTable.exerciseId],
    references: [exerciseTable.id],
  }),
  bodyPart: one(bodyPartTable, {
    fields: [exerciseToBodyPartTable.bodyPartId],
    references: [bodyPartTable.id],
  }),
}));
export const exerciseToEquipmentRelations = relations(exerciseToEquipmentTable, ({ one }) => ({
  exercise: one(exerciseTable, {
    fields: [exerciseToEquipmentTable.exerciseId],
    references: [exerciseTable.id],
  }),
  equipment: one(equipmentTable, {
    fields: [exerciseToEquipmentTable.equipmentId],
    references: [equipmentTable.id],
  }),
}));
export const exerciseToMuscleRelations = relations(exerciseToMuscleTable, ({ one }) => ({
  exercise: one(exerciseTable, {
    fields: [exerciseToMuscleTable.exerciseId],
    references: [exerciseTable.id],
  }),
  muscle: one(muscleTable, {
    fields: [exerciseToMuscleTable.muscleId],
    references: [muscleTable.id],
  }),
}));

export const exerciseDrizzleSchema = {
  bodyPart: bodyPartTable,
  equipment: equipmentTable,
  muscle: muscleTable,
  exercise: exerciseTable,
  exerciseRelations,
  exerciseToBodyPart: exerciseToBodyPartTable,
  exerciseToBodyPartRelations,
  exerciseToEquipment: exerciseToEquipmentTable,
  exerciseToEquipmentRelations,
  exerciseToMuscle: exerciseToMuscleTable,
  exerciseToMuscleRelations,
};
export const exercisePowerSyncTables = {
  bodyPart: toPowerSyncTable(bodyPartTable),
  equipment: toPowerSyncTable(equipmentTable),
  muscle: toPowerSyncTable(muscleTable),
  exercise: toPowerSyncTable(exerciseTable),
  exerciseToBodyPart: toPowerSyncTable(exerciseToBodyPartTable),
  exerciseToEquipment: toPowerSyncTable(exerciseToEquipmentTable),
  exerciseToMuscle: toPowerSyncTable(exerciseToMuscleTable),
};

export type BodyPart = typeof bodyPartTable.$inferSelect;
export type Equipment = typeof equipmentTable.$inferSelect;
export type Muscle = typeof muscleTable.$inferSelect;
export type Exercise = typeof exerciseTable.$inferSelect;
export type ExerciseToBodyPart = typeof exerciseToBodyPartTable.$inferSelect;
export type ExerciseToEquipment = typeof exerciseToEquipmentTable.$inferSelect;
export type ExerciseToMuscle = typeof exerciseToMuscleTable.$inferSelect;
