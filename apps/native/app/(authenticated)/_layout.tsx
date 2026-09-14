import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import { Text } from "panelui-native";
import { View } from "react-native";

import { authClient } from "@/lib/auth-client";
import { usePowerSyncSession } from "@/lib/powersync";

export default function AuthenticatedLayout() {
  const session = authClient.useSession();
  const powerSyncSession = usePowerSyncSession(
    session.isPending ? undefined : (session.data?.user.id ?? null),
    Boolean(session.error),
  );

  if (session.isPending) return <StatusMessage message="Loading session…" />;

  if (!session.error && !session.data?.user) {
    return powerSyncSession.ready ? (
      <Redirect href="/(auth)/login" />
    ) : (
      <StatusMessage message="Signing out…" />
    );
  }

  if (session.error && !powerSyncSession.activeUserId) {
    return (
      <StatusMessage
        message={
          powerSyncSession.ready
            ? "Offline — couldn’t verify your session, and no local owner was found."
            : (powerSyncSession.error?.message ?? "Preparing local data…")
        }
      />
    );
  }

  if (!powerSyncSession.ready) {
    return <StatusMessage message={powerSyncSession.error?.message ?? "Preparing local data…"} />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

function StatusMessage({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Text className="text-center" muted>
        {message}
      </Text>
    </View>
  );
}
