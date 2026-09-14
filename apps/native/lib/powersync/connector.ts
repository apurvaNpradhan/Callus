import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials,
} from "@powersync/react-native";
import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";
import { serverUrl } from "@/lib/server-url";

async function cookies() {
  return Platform.OS === "web" ? undefined : authClient.getCookie();
}

const credentialsSchema = z.object({
  endpoint: z.string().min(1),
  token: z.string().min(1),
});
const uploadResponseSchema = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
  rejected: z.array(z.string()).optional(),
});

export const powerSyncConnector: PowerSyncBackendConnector = {
  async fetchCredentials(): Promise<PowerSyncCredentials | null> {
    const cookie = await cookies();
    const response = await expoFetch(`${serverUrl}/powersync/credentials`, {
      headers: cookie ? { Cookie: cookie } : undefined,
      credentials: Platform.OS === "web" ? "include" : "omit",
    });
    if (response.status === 401) return null;
    if (!response.ok) throw new Error(`PowerSync credentials failed (${response.status})`);
    const body = credentialsSchema.parse(await response.json());
    return { endpoint: body.endpoint, token: body.token };
  },

  async uploadData(database: AbstractPowerSyncDatabase) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    const cookie = await cookies();
    const operations = transaction.crud.map((operation) => ({
      id: operation.id,
      table: operation.table,
      op: operation.op,
      ...(operation.opData ? { opData: operation.opData } : {}),
    }));
    const response = await expoFetch(`${serverUrl}/powersync/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify({ operations }),
      credentials: Platform.OS === "web" ? "include" : "omit",
    });
    if (!response.ok) throw new Error(`PowerSync upload failed (${response.status})`);
    const result = uploadResponseSchema.parse(await response.json());
    // 2xx responses are successful queue advances, but a server-side rejection must
    // not be silently dropped: the server state will reconcile, yet the user should
    // see feedback (e.g. debug logs) that an edit was not applied as written.
    if (result.rejected && Array.isArray(result.rejected) && result.rejected.length > 0) {
      console.log(
        `PowerSync upload: ${result.rejected.length} operation(s) rejected — ${result.error ?? "no reason"}. Server state will reconcile.`,
      );
    }
    if (result.ok !== true) throw new Error(result.error ?? "PowerSync upload was not accepted");
    await transaction.complete();
  },
};
