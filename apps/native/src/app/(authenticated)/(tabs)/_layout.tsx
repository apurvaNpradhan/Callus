import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useCSSVariable } from "uniwind";

import * as m from "@callus/i18n/native/messages";

import { parseNativeColor } from "@/shared/ui/parse-native-color";

export default function TabsLayout() {
  const foreground = useCSSVariable("--foreground");
  const muted = useCSSVariable("--muted");
  const surface = useCSSVariable("--surface");
  const border = useCSSVariable("--border");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: parseNativeColor(foreground),
        tabBarInactiveTintColor: parseNativeColor(muted),
        tabBarStyle: {
          backgroundColor: parseNativeColor(surface),
          borderTopColor: parseNativeColor(border)
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: m.mobile_tab_home(),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: m.mobile_settings_title(),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
