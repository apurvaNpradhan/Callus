import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { z } from "zod";

import * as m from "@callus/i18n/native/messages";

import { useAppForm } from "@/shared/ui/form";

import { AuthFormLayout } from "@/features/auth/ui/auth-form-layout";

export function SignInForm({
  onSubmit,
  footer
}: {
  onSubmit: (values: { email: string; password: string }) => Promise<string | null>;
  footer: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onSubmit: z.object({
        email: z
          .string()
          .trim()
          .pipe(z.email({ error: () => m.auth__invalid_email() })),
        password: z.string().min(8, { error: () => m.auth__password_min_length() })
      })
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        setError(await onSubmit({ ...value, email: value.email.trim() }));
      } catch {
        setError(m.mobile_auth_error());
      }
    }
  });

  return (
    <AuthFormLayout title={m.mobile_sign_in_title()} footer={footer}>
      <View className="gap-5">
        <form.AppField name="email">
          {(field) => (
            <field.EmailInputField
              label={m.mobile_email()}
              placeholder={m.auth__email_placeholder()}
            />
          )}
        </form.AppField>
        <form.AppField name="password">
          {(field) => (
            <field.PasswordInputField label={m.mobile_password()} autoComplete="current-password" />
          )}
        </form.AppField>
        {error ? (
          <Text className="text-danger text-sm" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <form.AppForm>
          <form.SubmitButton label={m.mobile_sign_in()} pendingLabel={m.mobile_working()} />
        </form.AppForm>
      </View>
    </AuthFormLayout>
  );
}
