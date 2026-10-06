import { createFileRoute } from "@tanstack/react-router";

import { generateAppSeo } from "@/shared/lib/seo";

import { DashboardScreen } from "@/screens/dashboard-screen";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () =>
    generateAppSeo({
      canonicalPath: "/dashboard",
      description: "Your personal Callus health dashboard.",
      robots: { follow: false, index: false },
      title: "Dashboard"
    }),
  component: DashboardScreen
});
