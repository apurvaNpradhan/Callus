import { Typography } from "heroui-native";
import { type JSX } from "react";
import { Text, View } from "react-native";

import * as m from "@callus/i18n/native/messages";

import { ServerStatusCard } from "@/features/server-status";

export default function HomeScreen(): JSX.Element {
  return (
    <View className="flex-1 gap-6 bg-background px-6 pt-10">
      <View className="gap-2">
        <Text className="font-mono text-sm font-medium tracking-[2px] text-foreground uppercase">
          Callus
        </Text>
        <Typography.Heading className="text-3xl font-semibold">
          {m.mobile_home_title()}
        </Typography.Heading>
        <Typography.Paragraph className="text-base text-muted">
          {m.mobile_home_description()}
        </Typography.Paragraph>
      </View>
      <ServerStatusCard />
    </View>
  );
}
