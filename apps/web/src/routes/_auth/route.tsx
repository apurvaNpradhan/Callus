import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireGuest } from "@/shared/lib/auth/tanstack-start/guards";

export const Route = createFileRoute("/_auth")({
  beforeLoad: ({ context }) =>
    requireGuest({
      queryClient: context.queryClient
    }),
  component: AuthLayout
});

function AuthLayout() {
  return <Outlet />;
}
