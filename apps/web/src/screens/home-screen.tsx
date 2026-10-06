import { Link } from "@tanstack/react-router";

import { m } from "@callus/i18n/messages";
import { Button } from "@callus/ui/components/button";

import { appConfig } from "@/config/app.config";

export function HomeScreen() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <p className="text-sm font-medium text-muted-foreground">{appConfig.site.longName}</p>
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Your health, in balance</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Plan meals, track macros, follow workouts, and see your progress in one place.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/sign-up">{m.auth__create_account()}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/sign-in">{m.auth__sign_in()}</Link>
        </Button>
      </div>
    </main>
  );
}
