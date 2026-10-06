import { type ErrorComponentProps } from "@tanstack/react-router";

import { Button } from "@callus/ui/components/button";

export function DefaultErrorScreen({ reset }: ErrorComponentProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        Please try again. If the problem continues, contact support.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
