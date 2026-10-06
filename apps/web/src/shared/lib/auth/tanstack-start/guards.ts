import { noop, type QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { getAuthUserQueryOptions } from "@/shared/lib/auth/tanstack-start/queries";

/**
 * Resolves the authenticated user from cache or server, initiating
 * background revalidation while returning immediately.
 */
export async function ensureAuthUser(queryClient: QueryClient) {
  const user = await queryClient.query({
    ...getAuthUserQueryOptions(),
    staleTime: "static"
  });

  void queryClient.query(getAuthUserQueryOptions()).catch(noop);

  return user;
}

/**
 * Route guard that requires the user to be authenticated.
 * Redirects to /sign-in if not authenticated.
 */
export async function requireAuthenticated({
  location,
  queryClient
}: {
  location: { hash: string; pathname: string; searchStr: string };
  queryClient: QueryClient;
}) {
  const user = await ensureAuthUser(queryClient);

  if (!user) {
    throw redirect({
      search: { redirect: `${location.pathname}${location.searchStr}${location.hash}` },
      to: "/sign-in"
    });
  }

  return user;
}

/**
 * Route guard that requires the user to be a guest.
 * Redirects to /dashboard if authenticated.
 */
export async function requireGuest({
  queryClient,
  redirectTo = "/dashboard"
}: {
  queryClient: QueryClient;
  redirectTo?: string;
}) {
  const user = await ensureAuthUser(queryClient);

  if (user) {
    throw redirect({ to: redirectTo });
  }

  return user;
}
