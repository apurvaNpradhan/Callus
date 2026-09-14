import { defineRelations } from "drizzle-orm";

import * as schema from "./index";

export const appRelations = defineRelations(schema, (r) => ({
  bodyPart: {
    exerciseLinks: r.many.exerciseToBodyPart({
      from: r.bodyPart.id,
      to: r.exerciseToBodyPart.bodyPartId,
    }),
  },
  equipment: {
    exerciseLinks: r.many.exerciseToEquipment({
      from: r.equipment.id,
      to: r.exerciseToEquipment.equipmentId,
    }),
  },
  exercise: {
    bodyPartLinks: r.many.exerciseToBodyPart({
      from: r.exercise.id,
      to: r.exerciseToBodyPart.exerciseId,
    }),
    equipmentLinks: r.many.exerciseToEquipment({
      from: r.exercise.id,
      to: r.exerciseToEquipment.exerciseId,
    }),
    muscleLinks: r.many.exerciseToMuscle({
      from: r.exercise.id,
      to: r.exerciseToMuscle.exerciseId,
    }),
    user: r.one.user({ from: r.exercise.userId, to: r.user.id }),
  },
  exerciseToBodyPart: {
    bodyPart: r.one.bodyPart({ from: r.exerciseToBodyPart.bodyPartId, to: r.bodyPart.id }),
    exercise: r.one.exercise({ from: r.exerciseToBodyPart.exerciseId, to: r.exercise.id }),
  },
  exerciseToEquipment: {
    equipment: r.one.equipment({ from: r.exerciseToEquipment.equipmentId, to: r.equipment.id }),
    exercise: r.one.exercise({ from: r.exerciseToEquipment.exerciseId, to: r.exercise.id }),
  },
  exerciseToMuscle: {
    exercise: r.one.exercise({ from: r.exerciseToMuscle.exerciseId, to: r.exercise.id }),
    muscle: r.one.muscle({ from: r.exerciseToMuscle.muscleId, to: r.muscle.id }),
  },
  muscle: {
    exerciseLinks: r.many.exerciseToMuscle({
      from: r.muscle.id,
      to: r.exerciseToMuscle.muscleId,
    }),
  },
  user: {
    exercises: r.many.exercise({ from: r.user.id, to: r.exercise.userId }),
  },
}));
