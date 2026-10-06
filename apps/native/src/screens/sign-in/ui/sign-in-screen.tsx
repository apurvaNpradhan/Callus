import { router } from "expo-router";
import { Button } from "heroui-native";
import { type JSX } from "react";

import * as m from "@callus/i18n/native/messages";

import { authClient } from "@/shared/api/auth-client";

import { SignInForm } from "@/features/auth";

export default function SignInScreen(): JSX.Element {
  return (
    <SignInForm
      onSubmit={async ({ email, password }) => {
        const result = await authClient.signIn.email({ email, password });

        if (result.error) {
          return result.error.message ?? m.mobile_auth_error();
        }

        return null;
      }}
      footer={
        <Button size="sm" variant="ghost" onPress={() => router.replace("/(auth)/sign-up")}>
          <Button.Label>{m.mobile_need_account()}</Button.Label>
        </Button>
      }
    />
  );
}
