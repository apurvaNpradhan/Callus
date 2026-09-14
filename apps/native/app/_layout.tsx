import { PowerSyncContext } from "@powersync/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { PanelUIProvider } from "panelui-native";
import { useEffect, useState } from "react";
import { Pressable, SafeAreaView, Text } from "react-native";

import { authClient } from "@/lib/auth-client";
import {
  createPowerSyncDatabase,
  getPowerSyncDatabase,
  preparePreseededDatabase,
  setPowerSyncDatabase,
} from "@/lib/powersync";
import { queryClient } from "@/utils/orpc";

// oxlint-disable-next-line import/no-relative-parent-imports
import "../global.css";

export default function RootLayout() {
  const session = authClient.useSession();
  const [database, setDatabase] = useState(getPowerSyncDatabase);
  const [databaseError, setDatabaseError] = useState<Error>();
  const [retryCount, setRetryCount] = useState(0);
  const userId = session.data?.user?.id;
  const authenticated = Boolean(userId && !session.error);
  const needsDatabase = authenticated || Boolean(session.error);

  useEffect(() => {
    if (database || session.isPending || !needsDatabase) return;

    let cancelled = false;
    void (async () => {
      try {
        // Preseed failures fall back to an empty local database internally, so only
        // real database-creation failures surface here as a recoverable error.
        if (authenticated) await preparePreseededDatabase();
        if (cancelled) return;
        const nextDatabase = createPowerSyncDatabase({ dbFilename: "callus.db" });
        setPowerSyncDatabase(nextDatabase);
        setDatabase(nextDatabase);
      } catch (cause) {
        if (cancelled) return;
        setDatabaseError(cause instanceof Error ? cause : new Error(String(cause)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authenticated, database, needsDatabase, retryCount, session.isPending]);

  if (needsDatabase && !database) {
    if (databaseError) {
      return (
        <SafeAreaView className="flex-1 items-center justify-center gap-4 px-6">
          <Text style={{ fontSize: 20, fontWeight: "600" }}>Local database unavailable</Text>
          <Text style={{ textAlign: "center", opacity: 0.6 }}>{databaseError.message}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setDatabaseError(undefined);
              setRetryCount((count) => count + 1);
            }}
            style={{
              borderWidth: 1,
              borderColor: "#888",
              borderRadius: 8,
              paddingHorizontal: 20,
              paddingVertical: 10,
            }}
          >
            <Text>Retry</Text>
          </Pressable>
        </SafeAreaView>
      );
    }
    return null;
  }

  const content = (
    <PanelUIProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(authenticated)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </QueryClientProvider>
    </PanelUIProvider>
  );

  return database ? (
    <PowerSyncContext.Provider value={database.powerSync}>{content}</PowerSyncContext.Provider>
  ) : (
    content
  );
}
