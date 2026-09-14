import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";

import { authClient } from "@/lib/auth-client";

export default function AuthLayout() {
  const session = authClient.useSession();
  if (!session.isPending && !session.error && session.data?.user) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}
