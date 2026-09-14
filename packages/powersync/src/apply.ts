import { db } from "@callus/db";

import { applyExerciseOperations } from "./exercises";
import type { UploadOperation } from "./upload";

export async function applyPowerSyncTransaction(
  userId: string,
  operations: readonly UploadOperation[],
) {
  await db.transaction((tx) => applyExerciseOperations(tx, userId, operations));
}
