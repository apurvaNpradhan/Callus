import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { loadExerciseData } from "./exercise-data";

describe("exercise catalog", () => {
  it("matches the confirmed catalog counts and has trimmed output", () => {
    const data = loadExerciseData();
    assert.equal(data.exercises.length, 7542);
    assert.equal(data.bodyParts.length, 20);
    assert.equal(data.equipment.length, 28);
    assert.equal(data.muscles.length, 44);
    assert.equal(data.exerciseToBodyParts.length, 8786);
    assert.equal(data.exerciseToEquipment.length, 7561);
    assert.equal(data.exerciseToMuscles.length, 35358);

    for (const rows of [data.bodyParts, data.equipment, data.muscles, data.exercises]) {
      for (const row of rows) assert.equal(row.name, row.name.trim());
    }
  });
});
