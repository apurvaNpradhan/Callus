import { z } from "zod";

const id = z.string().trim().min(1).max(256);
const exerciseType = z.enum(["weight_reps", "duration", "distance_duration"]);
const nullableText = z.string().trim().max(10_000).nullable();
const serverFields = {
  created_at: z.string().max(64).optional(),
  updated_at: z.string().max(64).optional(),
  user_id: z.string().max(256).nullable().optional(),
};

const exercisePut = z.object({
  table: z.literal("exercise"),
  op: z.literal("PUT"),
  id,
  opData: z
    .object({
      exercise_type: exerciseType,
      image_key: z.null().optional(),
      instructions: nullableText.optional(),
      name: z.string().trim().min(1).max(200),
      video_key: z.null().optional(),
      ...serverFields,
    })
    .strict(),
});

const exercisePatch = z.object({
  table: z.literal("exercise"),
  op: z.literal("PATCH"),
  id,
  opData: z
    .object({
      exercise_type: exerciseType.optional(),
      image_key: z.null().optional(),
      instructions: nullableText.optional(),
      name: z.string().trim().min(1).max(200).optional(),
      video_key: z.null().optional(),
      ...serverFields,
    })
    .strict()
    .refine(
      (value) =>
        Object.keys(value).some((key) => !["created_at", "updated_at", "user_id"].includes(key)),
      { message: "PATCH must include a writable exercise field" },
    ),
});

const exerciseDelete = z.object({
  table: z.literal("exercise"),
  op: z.literal("DELETE"),
  id,
  opData: z.undefined().optional(),
});

const booleanValue = z
  .union([z.boolean(), z.literal(0), z.literal(1)])
  .transform((value) => value === true || value === 1);

const bodyPartLink = z.union([
  z.object({
    table: z.literal("exercise_to_body_part"),
    op: z.literal("PUT"),
    id,
    opData: z.object({ body_part_id: id, exercise_id: id }).strict(),
  }),
  z.object({
    table: z.literal("exercise_to_body_part"),
    op: z.literal("PATCH"),
    id,
    opData: z
      .object({ body_part_id: id.optional(), exercise_id: id.optional() })
      .strict()
      .refine((value) => Object.keys(value).length > 0),
  }),
  z.object({
    table: z.literal("exercise_to_body_part"),
    op: z.literal("DELETE"),
    id,
    opData: z.undefined().optional(),
  }),
]);

const equipmentLink = z.union([
  z.object({
    table: z.literal("exercise_to_equipment"),
    op: z.literal("PUT"),
    id,
    opData: z.object({ equipment_id: id, exercise_id: id }).strict(),
  }),
  z.object({
    table: z.literal("exercise_to_equipment"),
    op: z.literal("PATCH"),
    id,
    opData: z
      .object({ equipment_id: id.optional(), exercise_id: id.optional() })
      .strict()
      .refine((value) => Object.keys(value).length > 0),
  }),
  z.object({
    table: z.literal("exercise_to_equipment"),
    op: z.literal("DELETE"),
    id,
    opData: z.undefined().optional(),
  }),
]);

const muscleLink = z.union([
  z.object({
    table: z.literal("exercise_to_muscle"),
    op: z.literal("PUT"),
    id,
    opData: z.object({ exercise_id: id, is_primary: booleanValue, muscle_id: id }).strict(),
  }),
  z.object({
    table: z.literal("exercise_to_muscle"),
    op: z.literal("PATCH"),
    id,
    opData: z
      .object({
        exercise_id: id.optional(),
        is_primary: booleanValue.optional(),
        muscle_id: id.optional(),
      })
      .strict()
      .refine((value) => Object.keys(value).length > 0),
  }),
  z.object({
    table: z.literal("exercise_to_muscle"),
    op: z.literal("DELETE"),
    id,
    opData: z.undefined().optional(),
  }),
]);

export const uploadOperationSchema = z.union([
  exercisePut,
  exercisePatch,
  exerciseDelete,
  bodyPartLink,
  equipmentLink,
  muscleLink,
]);

export const uploadPayloadSchema = z
  .object({ operations: z.array(uploadOperationSchema).min(1).max(200) })
  .strict();

export type UploadOperation = z.infer<typeof uploadOperationSchema>;
export type UploadPayload = z.infer<typeof uploadPayloadSchema>;

export const MAX_UPLOAD_BYTES = 64_000;
