import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { PanelUIProvider } from "panelui-native";

import { queryClient } from "@/utils/orpc";

// oxlint-disable-next-line import/no-relative-parent-imports
import "../global.css";

export default function RootLayout() {
  return (
    <PanelUIProvider>
      <QueryClientProvider client={queryClient}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </PanelUIProvider>
  );
}
