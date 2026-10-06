import { createFileRoute } from "@tanstack/react-router";

import { requireGuest } from "@/shared/lib/auth/tanstack-start/guards";
import { generateAppSeo } from "@/shared/lib/seo";

import { HomeScreen } from "@/screens/home-screen";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) =>
    requireGuest({
      queryClient: context.queryClient
    }),
  head: () =>
    generateAppSeo({
      canonicalPath: "/",
      description: "Plan meals, track macros, follow workouts, and see your progress with Callus.",
      title: "Your health, in balance"
    }),
  component: HomeScreen
});
