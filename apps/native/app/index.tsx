import { StatusBar } from "expo-status-bar";
import { Button, MoonIcon, SunIcon, Text, useThemeMode } from "panelui-native";
import { View } from "react-native";

export default function Index() {
  const { mode, toggleMode } = useThemeMode();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background">
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Text size="3xl" weight="semibold">
        Callus
      </Text>
      <Button
        accessibilityLabel={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
        onPress={toggleMode}
        size="icon"
        variant="ghost"
      >
        {mode === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </Button>
    </View>
  );
}
