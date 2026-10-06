import { expoClient } from "@better-auth/expo/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

import { type Auth } from "@callus/auth/schema";

import { serverUrl } from "@/shared/config";

export const authClient = createAuthClient({
  baseURL: `${serverUrl}/auth`,
  plugins: [
    inferAdditionalFields<Auth>(),
    expoClient({
      scheme: "callus",
      storage: SecureStore,
      storagePrefix: "callus"
    })
  ]
});
