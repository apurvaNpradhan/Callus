import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { type ReactNode } from "react";

import { Button } from "@callus/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@callus/ui/components/field";
import { Input } from "@callus/ui/components/input";

const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

type TextInputFieldProps = {
  label: ReactNode;
  placeholder?: string;
  autoComplete?: string;
  readOnly?: boolean;
};

function TextInputField({ label, placeholder, autoComplete, readOnly }: TextInputFieldProps) {
  const field = useFieldContext<string>();
  const hasErrors = field.state.meta.errors.length > 0;

  return (
    <Field data-invalid={hasErrors || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        aria-invalid={hasErrors || undefined}
        autoComplete={autoComplete}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        value={field.state.value}
      />
      {field.state.meta.errors.map((error, index) => (
        <FieldDescription className="text-destructive" key={index}>
          {error?.message}
        </FieldDescription>
      ))}
    </Field>
  );
}

function EmailInputField({ label, placeholder, readOnly }: TextInputFieldProps) {
  const field = useFieldContext<string>();
  const hasErrors = field.state.meta.errors.length > 0;

  return (
    <Field data-invalid={hasErrors || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        aria-invalid={hasErrors || undefined}
        autoComplete="email"
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        type="email"
        value={field.state.value}
      />
      {field.state.meta.errors.map((error, index) => (
        <FieldDescription className="text-destructive" key={index}>
          {error?.message}
        </FieldDescription>
      ))}
    </Field>
  );
}

function PasswordInputField({ label, autoComplete, readOnly }: TextInputFieldProps) {
  const field = useFieldContext<string>();
  const hasErrors = field.state.meta.errors.length > 0;

  return (
    <Field data-invalid={hasErrors || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        aria-invalid={hasErrors || undefined}
        autoComplete={autoComplete}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        readOnly={readOnly}
        type="password"
        value={field.state.value}
      />
      {field.state.meta.errors.map((error, index) => (
        <FieldDescription className="text-destructive" key={index}>
          {error?.message}
        </FieldDescription>
      ))}
    </Field>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  pending,
  disabled
}: {
  label: ReactNode;
  pendingLabel?: ReactNode;
  pending?: boolean;
  disabled?: boolean;
}) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => {
        const isBusy = pending ? true : isSubmitting;

        return (
          <Button light="skeuomorphic" type="submit" disabled={disabled ? true : isBusy}>
            {isBusy ? (pendingLabel ?? label) : label}
          </Button>
        );
      }}
    </form.Subscribe>
  );
}

export const { useAppForm } = createFormHook({
  fieldComponents: {
    EmailInputField,
    PasswordInputField,
    TextInputField
  },
  formComponents: { SubmitButton },
  fieldContext,
  formContext
});
