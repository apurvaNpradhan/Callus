import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { Button, FieldError, Input, Label, TextField } from "heroui-native";
import { type ReactNode } from "react";
import { type TextInputProps } from "react-native";

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

type InputFieldProps = {
  label: ReactNode;
  placeholder?: string;
  autoComplete?: TextInputProps["autoComplete"];
};

function TextInputField({ label, placeholder, autoComplete }: InputFieldProps) {
  const field = useFieldContext<string>();
  const error = field.state.meta.errors[0];

  return (
    <TextField isRequired isInvalid={field.state.meta.isTouched && Boolean(error)}>
      <Label>{label}</Label>
      <Input
        className="android:border-field-border"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChangeText={field.handleChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      {error && <FieldError>{error.message}</FieldError>}
    </TextField>
  );
}

function EmailInputField({ label, placeholder }: InputFieldProps) {
  const field = useFieldContext<string>();
  const error = field.state.meta.errors[0];

  return (
    <TextField isRequired isInvalid={field.state.meta.isTouched && Boolean(error)}>
      <Label>{label}</Label>
      <Input
        className="android:border-field-border"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChangeText={field.handleChange}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        placeholder={placeholder}
      />
      {error && <FieldError>{error.message}</FieldError>}
    </TextField>
  );
}

function PasswordInputField({ label, autoComplete }: InputFieldProps) {
  const field = useFieldContext<string>();
  const error = field.state.meta.errors[0];

  return (
    <TextField isRequired isInvalid={field.state.meta.isTouched && Boolean(error)}>
      <Label>{label}</Label>
      <Input
        className="android:border-field-border"
        value={field.state.value}
        onBlur={field.handleBlur}
        onChangeText={field.handleChange}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={autoComplete ?? "new-password"}
      />
      {error && <FieldError>{error.message}</FieldError>}
    </TextField>
  );
}

function SubmitButton({ label, pendingLabel }: { label: ReactNode; pendingLabel: ReactNode }) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button
          className="rounded-md"
          onPress={() => void form.handleSubmit()}
          isDisabled={isSubmitting}
        >
          <Button.Label>{isSubmitting ? pendingLabel : label}</Button.Label>
        </Button>
      )}
    </form.Subscribe>
  );
}

export const { useAppForm } = createFormHook({
  fieldComponents: { EmailInputField, PasswordInputField, TextInputField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext
});
