import { Button, Typography } from "heroui-native";
import { type JSX, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useCSSVariable } from "uniwind";

import * as m from "@callus/i18n/native/messages";

import { authClient } from "@/shared/api/auth-client";
import { useThemeMode } from "@/shared/providers/theme-mode-provider";
import { parseNativeColor } from "@/shared/ui/parse-native-color";

export default function SettingsScreen(): JSX.Element {
  const { themeMode, setThemeMode } = useThemeMode();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const borderColor = useCSSVariable("--border");
  const accentColor = useCSSVariable("--accent");
  const accentForegroundColor = useCSSVariable("--accent-foreground");

  async function signOut() {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError(null);

    try {
      const result = await authClient.signOut();

      if (result.error) setSignOutError(m.mobile_sign_out_error());
    } catch {
      setSignOutError(m.mobile_sign_out_error());
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View className="flex-1 gap-6 bg-background px-6 pt-10">
      <View className="gap-2">
        <Typography.Heading className="text-3xl font-semibold">
          {m.mobile_settings_title()}
        </Typography.Heading>
      </View>
      <View className="gap-3">
        <Typography.Paragraph className="text-base text-muted">
          {m.mobile_theme()}
        </Typography.Paragraph>
        <View className="flex-row items-center justify-between rounded-lg border border-border px-4 py-3">
          <Text className="text-sm text-foreground">{m.mobile_dark_mode()}</Text>
          <Switch
            accessibilityLabel={m.mobile_dark_mode()}
            trackColor={{
              false: parseNativeColor(borderColor),
              true: parseNativeColor(accentColor)
            }}
            thumbColor={parseNativeColor(accentForegroundColor)}
            value={themeMode === "dark"}
            onValueChange={(enabled) => void setThemeMode(enabled ? "dark" : "light")}
          />
        </View>
      </View>
      {signOutError ? (
        <Text className="text-danger text-sm" accessibilityRole="alert">
          {signOutError}
        </Text>
      ) : null}
      <Button
        variant="outline"
        className="border-field-border rounded-md"
        isDisabled={signingOut}
        onPress={() => void signOut()}
      >
        <Button.Label>{signingOut ? m.mobile_working() : m.mobile_sign_out()}</Button.Label>
      </Button>
    </View>
  );
}
