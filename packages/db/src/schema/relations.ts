import { defineRelations } from "drizzle-orm";

import * as schema from "./index";

export const appRelations = defineRelations(schema, (_r) => ({}));
