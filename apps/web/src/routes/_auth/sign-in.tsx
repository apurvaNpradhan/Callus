import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { generateAppSeo } from "@/shared/lib/seo";

import { SignInForm } from "@/features/auth";

const authRedirectSearch = z.object({
  redirect: z
    .string()
    .optional()
    .transform((value) => {
      if (!value?.startsWith("/") || value.startsWith("//")) {
        return undefined;
      }

      try {
        const target = new URL(value, "https://callus.local");

        return target.origin === "https://callus.local"
          ? `${target.pathname}${target.search}${target.hash}`
          : undefined;
      } catch {
        return undefined;
      }
    })
});

export const Route = createFileRoute("/_auth/sign-in")({
  validateSearch: authRedirectSearch,
  head: () => {
    return {
      ...generateAppSeo({
        canonicalPath: "/sign-in",
        description: "Sign in to your Callus account.",
        robots: { follow: false, index: false },
        title: "Sign in"
      })
    };
  },
  component: SignInRoute
});

function SignInRoute() {
  const { redirect } = Route.useSearch();

  return <SignInForm redirectTo={redirect ?? "/dashboard"} />;
}
