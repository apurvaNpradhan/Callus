import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vite-plus/test";

import { type AuthUser } from "@callus/auth/schema";

import {
  ensureAuthUser,
  requireAuthenticated,
  requireGuest
} from "@/shared/lib/auth/tanstack-start/guards";
import { getAuthUserQueryOptions } from "@/shared/lib/auth/tanstack-start/queries";

const mockUser: AuthUser = {
  createdAt: new Date(),
  email: "alice@example.com",
  emailVerified: true,
  id: "user_1",
  image: null,
  locale: "en",
  name: "Alice",
  updatedAt: new Date()
};

describe("auth route guards", () => {
  it("ensureAuthUser returns user and revalidates in background", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(getAuthUserQueryOptions().queryKey, mockUser);

    const user = await ensureAuthUser(queryClient);

    expect(user).toEqual(mockUser);
  });

  it("requireAuthenticated throws redirect when user is null", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(getAuthUserQueryOptions().queryKey, null);

    const location = { hash: "", pathname: "/dashboard", searchStr: "" };

    await expect(requireAuthenticated({ location, queryClient })).rejects.toMatchObject({
      status: 307
    });
  });

  it("requireAuthenticated passes when user exists", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(getAuthUserQueryOptions().queryKey, mockUser);

    const location = { hash: "", pathname: "/dashboard", searchStr: "" };
    const user = await requireAuthenticated({ location, queryClient });

    expect(user).toEqual(mockUser);
  });

  it("requireGuest throws redirect when user exists", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(getAuthUserQueryOptions().queryKey, mockUser);

    await expect(requireGuest({ queryClient, redirectTo: "/dashboard" })).rejects.toMatchObject({
      status: 307
    });
  });

  it("requireGuest passes when user is null", async () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(getAuthUserQueryOptions().queryKey, null);

    const user = await requireGuest({ queryClient });

    expect(user).toBeNull();
  });
});
