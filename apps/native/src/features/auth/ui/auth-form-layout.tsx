import { useRouter } from "expo-router";
import { Button, Typography } from "heroui-native";
import { type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import * as m from "@callus/i18n/native/messages";

export function AuthFormLayout({
  title,
  children,
  footer
}: {
  title: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="px-4 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              accessibilityLabel={m.mobile_back()}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)"))}
            >
              <Button.Label>{m.mobile_back()}</Button.Label>
            </Button>
          </View>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <View className="flex-1 justify-center px-6 py-10">
              <View className="mx-auto w-full max-w-md gap-7">
                <View className="gap-2">
                  <Text className="font-mono text-sm font-medium tracking-[2px] text-foreground uppercase">
                    Callus
                  </Text>
                  <Typography.Heading className="text-3xl font-semibold">
                    {title}
                  </Typography.Heading>
                </View>
                {children}
                {footer}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
