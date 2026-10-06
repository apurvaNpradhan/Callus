import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireAuthenticated } from "@/shared/lib/auth/tanstack-start/guards";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) =>
    requireAuthenticated({
      location,
      queryClient: context.queryClient
    }),
  component: AuthenticatedLayout
});

function AuthenticatedLayout() {
  return <Outlet />;
}
