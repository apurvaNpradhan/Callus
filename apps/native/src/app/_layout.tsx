import { GeistMono_400Regular } from "@expo-google-fonts/geist-mono/400Regular";
import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { type JSX, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { authClient } from "@/shared/api/auth-client";
import { ThemeModeProvider, useThemeMode } from "@/shared/providers/theme-mode-provider";
import { parseNativeColor } from "@/shared/ui/parse-native-color";

import { LocaleProvider } from "@/features/locale";

import "@/global.css";

void SplashScreen.preventAutoHideAsync();

function AppNavigator(): JSX.Element {
  const { data: session, isPending } = authClient.useSession();
  const accentColor = useCSSVariable("--accent");

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={parseNativeColor(accentColor)} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="(authenticated)" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" options={{ headerShown: true, title: "Not found" }} />
    </Stack>
  );
}

function AppStatusBar(): JSX.Element {
  const { themeMode } = useThemeMode();

  return <StatusBar style={themeMode === "dark" ? "light" : "dark"} />;
}

export default function RootLayout(): JSX.Element | null {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider>
          <ThemeModeProvider>
            <LocaleProvider>
              <AppNavigator />
              <AppStatusBar />
            </LocaleProvider>
          </ThemeModeProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
