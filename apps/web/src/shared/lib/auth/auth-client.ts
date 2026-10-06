import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { type auth } from "@callus/auth/index";
import { ENV_WEB_ISOMORPHIC } from "@callus/env/web/env.isomorphic";

export const API_AUTH_URL = `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/auth`;

/**
 * IMPORTANT: Only use this for client-side operations (e.g. in React components or browser-only hooks).
 * It uses nanostores internally, which are not suitable for server-side usage due to lack of request isolation, leading to shared auth state.
 */
export const authClient = createAuthClient({
  baseURL: API_AUTH_URL,
  plugins: [inferAdditionalFields<typeof auth>()]
});

export type AuthSession = typeof authClient.$Infer.Session;
