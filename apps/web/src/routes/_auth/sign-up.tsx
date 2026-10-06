import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { generateAppSeo } from "@/shared/lib/seo";

import { CreateAnAccountForm } from "@/features/auth";

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

export const Route = createFileRoute("/_auth/sign-up")({
  validateSearch: authRedirectSearch,
  head: () => {
    return {
      ...generateAppSeo({
        canonicalPath: "/sign-up",
        description: "Create your Callus account.",
        robots: { follow: false, index: false },
        title: "Create an account"
      })
    };
  },
  component: SignUpRoute
});

function SignUpRoute() {
  const { redirect } = Route.useSearch();

  return <CreateAnAccountForm redirectTo={redirect ?? "/dashboard"} />;
}
