import { Typography } from "heroui-native";
import { type JSX, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import * as m from "@callus/i18n/native/messages";

import { getServerStatus } from "@/features/server-status/api/get-server-status";

type ServerStatus = Awaited<ReturnType<typeof getServerStatus>>;

/** Shows the native app's API connectivity and authenticated RPC status. */
export function ServerStatusCard(): JSX.Element {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void getServerStatus()
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch(() => {
        if (active) setStatus(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <View className="gap-3 rounded-lg border border-border p-4">
      <Typography.Paragraph className="text-sm font-medium text-foreground">
        {m.mobile_server_status()}
      </Typography.Paragraph>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Text className="text-sm text-muted">
          {status?.health === "healthy" ? m.mobile_connected() : m.mobile_unavailable()}
          {status?.privateMessage ? ` · ${status.privateMessage}` : ""}
        </Text>
      )}
    </View>
  );
}
