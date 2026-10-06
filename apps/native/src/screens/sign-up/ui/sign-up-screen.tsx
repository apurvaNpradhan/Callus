import { router } from "expo-router";
import { Button } from "heroui-native";
import { type JSX } from "react";

import * as m from "@callus/i18n/native/messages";

import { authClient } from "@/shared/api/auth-client";

import { SignUpForm, createSignUpInput } from "@/features/auth";
import { useLocale } from "@/features/locale";

export default function SignUpScreen(): JSX.Element {
  const { locale } = useLocale();

  return (
    <SignUpForm
      onSubmit={async ({ name, email, password }) => {
        const result = await authClient.signUp.email(
          createSignUpInput({ name, email, password }, locale)
        );

        if (result.error) {
          return result.error.message ?? m.mobile_auth_error();
        }

        return null;
      }}
      footer={
        <Button size="sm" variant="ghost" onPress={() => router.replace("/(auth)/sign-in")}>
          <Button.Label>{m.mobile_have_account()}</Button.Label>
        </Button>
      }
    />
  );
}
