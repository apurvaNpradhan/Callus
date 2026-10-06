import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";

import * as m from "@callus/i18n/native/messages";

import { useAppForm } from "@/shared/ui/form";

import { createSignUpValidation } from "@/features/auth/model/sign-up-validation";
import { AuthFormLayout } from "@/features/auth/ui/auth-form-layout";

export function SignUpForm({
  onSubmit,
  footer
}: {
  onSubmit: (values: { name: string; email: string; password: string }) => Promise<string | null>;
  footer: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    validators: {
      onSubmit: createSignUpValidation()
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        setError(
          await onSubmit({
            name: value.name.trim(),
            email: value.email.trim(),
            password: value.password
          })
        );
      } catch {
        setError(m.mobile_auth_error());
      }
    }
  });

  return (
    <AuthFormLayout title={m.mobile_sign_up_title()} footer={footer}>
      <View className="gap-5">
        <form.AppField name="name">
          {(field) => (
            <field.TextInputField
              label={m.mobile_name()}
              placeholder={m.auth__name_placeholder()}
              autoComplete="name"
            />
          )}
        </form.AppField>
        <form.AppField name="email">
          {(field) => (
            <field.EmailInputField
              label={m.mobile_email()}
              placeholder={m.auth__email_placeholder()}
            />
          )}
        </form.AppField>
        <form.AppField name="password">
          {(field) => <field.PasswordInputField label={m.mobile_password()} />}
        </form.AppField>
        <form.AppField name="confirmPassword">
          {(field) => (
            <field.PasswordInputField
              label={m.auth__confirm_password_label()}
              autoComplete="new-password"
            />
          )}
        </form.AppField>
        {error ? (
          <Text className="text-danger text-sm" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <form.AppForm>
          <form.SubmitButton label={m.mobile_create_account()} pendingLabel={m.mobile_working()} />
        </form.AppForm>
      </View>
    </AuthFormLayout>
  );
}
