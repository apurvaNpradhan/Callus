import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { Image, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as m from "@callus/i18n/native/messages";

import { useThemeMode } from "@/shared/providers/theme-mode-provider";

export default function WelcomeScreen() {
  const router = useRouter();
  const { themeMode } = useThemeMode();

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <View
          className="absolute inset-0 overflow-hidden"
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent opacity-5" />
          <View className="absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-accent opacity-5" />
        </View>
        <View className="flex-1 justify-center gap-10 px-6 py-10">
          <View className="mx-auto w-full max-w-md items-center gap-6">
            <Image
              source={
                themeMode === "dark" ? require("./logo-dark.png") : require("./logo-light.png")
              }
              className="size-24"
              resizeMode="contain"
              accessible={false}
              accessibilityIgnoresInvertColors
            />
            <View className="gap-2">
              <Typography.Heading className="text-center text-3xl font-semibold">
                {m.mobile_welcome_title()}
              </Typography.Heading>
              <Typography.Paragraph className="text-center text-base text-muted">
                {m.mobile_welcome_description()}
              </Typography.Paragraph>
            </View>
          </View>
          <View className="mx-auto w-full max-w-md gap-3">
            <Button className="rounded-md" onPress={() => router.push("/(auth)/sign-in")}>
              <Button.Label>{m.mobile_sign_in()}</Button.Label>
            </Button>
            <Button
              variant="outline"
              className="border-field-border rounded-md"
              onPress={() => router.push("/(auth)/sign-up")}
            >
              <Button.Label>{m.mobile_create_account()}</Button.Label>
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
