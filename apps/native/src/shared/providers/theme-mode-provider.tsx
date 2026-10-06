import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme, ThemeProvider as RouterThemeProvider } from "expo-router";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { type PropsWithChildren } from "react";
import { Appearance } from "react-native";
import { Uniwind, useCSSVariable } from "uniwind";

import { parseNativeColor } from "@/shared/ui/parse-native-color";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
};

const ThemeModeContext = createContext<ThemeContextValue | null>(null);

const themeStorageKey = "callus-theme-mode";

export function ThemeModeProvider({ children }: PropsWithChildren) {
  const [themeMode, setThemeModeState] = useState<ThemeMode | null>(null);
  const background = useCSSVariable("--background");
  const surface = useCSSVariable("--surface");
  const foreground = useCSSVariable("--foreground");
  const border = useCSSVariable("--border");
  const accent = useCSSVariable("--accent");

  useEffect(() => {
    let active = true;

    void AsyncStorage.getItem(themeStorageKey)
      .catch(() => null)
      .then((savedTheme) => {
        const initialTheme: ThemeMode =
          savedTheme === "light" || savedTheme === "dark"
            ? savedTheme
            : Appearance.getColorScheme() === "dark"
              ? "dark"
              : "light";

        Uniwind.setTheme(initialTheme);

        if (active) setThemeModeState(initialTheme);
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue | null>(
    () =>
      themeMode
        ? {
            themeMode,
            async setThemeMode(nextThemeMode) {
              Uniwind.setTheme(nextThemeMode);
              setThemeModeState(nextThemeMode);
              await AsyncStorage.setItem(themeStorageKey, nextThemeMode);
            }
          }
        : null,
    [themeMode]
  );

  const navigationTheme = useMemo(() => {
    const base = themeMode === "dark" ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        background: parseNativeColor(background) ?? base.colors.background,
        card: parseNativeColor(surface) ?? base.colors.card,
        text: parseNativeColor(foreground) ?? base.colors.text,
        border: parseNativeColor(border) ?? base.colors.border,
        primary: parseNativeColor(accent) ?? base.colors.primary
      }
    };
  }, [themeMode, background, surface, foreground, border, accent]);

  if (!value) return null;

  return (
    <ThemeModeContext.Provider value={value}>
      <RouterThemeProvider value={navigationTheme}>{children}</RouterThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const value = useContext(ThemeModeContext);

  if (!value) {
    throw new Error("useThemeMode must be used inside ThemeModeProvider");
  }

  return value;
}
