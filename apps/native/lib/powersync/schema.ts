import { DrizzleAppSchema } from "@powersync/drizzle-driver";

import { exerciseDrizzleSchema, exercisePowerSyncTables } from "@/features/exercises/schema";

export const drizzleSchema = exerciseDrizzleSchema;
export const AppSchema = new DrizzleAppSchema(drizzleSchema);
export const powerSyncTables = exercisePowerSyncTables;
