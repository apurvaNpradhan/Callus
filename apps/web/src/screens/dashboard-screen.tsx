import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@callus/ui/components/button";

import { authClient } from "@/shared/lib/auth/auth-client";
import { useAuth } from "@/shared/lib/auth/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@/shared/lib/auth/tanstack-start/queries";

import { useGetServerStatusQuery } from "@/features/server-status";

export function DashboardScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const serverStatus = useGetServerStatusQuery();

  const signOutMutation = useMutation({
    mutationFn: () => authClient.signOut(),
    onError: () => toast.error("Unable to sign out. Please try again."),
    onSuccess: async () => {
      queryClient.setQueryData(getAuthUserQueryOptions().queryKey, null);
      await navigate({ to: "/" });
    }
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Callus</p>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{user?.name ? `, ${user.name}` : ""}. Your health journey starts here.
        </p>
        <div className="flex items-center gap-4 pt-2">
          <Button disabled={signOutMutation.isPending} onClick={() => signOutMutation.mutate()}>
            {signOutMutation.isPending ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </header>

      <section className="rounded-lg border p-4 text-sm">
        <p className="font-medium text-foreground">API Status</p>
        <p className="mt-1 text-muted-foreground">
          {serverStatus.isLoading
            ? "Checking server status…"
            : serverStatus.isError
              ? "Unable to connect to API"
              : `Status: ${serverStatus.health ?? "unknown"}${serverStatus.privateMessage ? ` · ${serverStatus.privateMessage}` : ""}`}
        </p>
      </section>
    </main>
  );
}
