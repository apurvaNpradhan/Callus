import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

import { serverUrl } from "@/lib/server-url";

const configuredScheme = Constants.expoConfig?.scheme;
const scheme = typeof configuredScheme === "string" ? configuredScheme : "callus";

export const authClient = createAuthClient({
  baseURL: serverUrl,
  plugins: [
    expoClient({
      scheme,
      storagePrefix: scheme,
      storage: SecureStore,
    }),
  ],
});
