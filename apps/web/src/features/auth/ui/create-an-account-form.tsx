import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { createSignUpSchema } from "@callus/core/auth";
import { m } from "@callus/i18n/messages";
import { FieldDescription, FieldGroup } from "@callus/ui/components/field";
import { Spinner } from "@callus/ui/components/spinner";
import { cn } from "@callus/ui/lib/utils";

import { authClient } from "@/shared/lib/auth/auth-client";
import { useAuth } from "@/shared/lib/auth/tanstack-start/hooks";
import { getAuthUserQueryOptions } from "@/shared/lib/auth/tanstack-start/queries";
import { Container } from "@/shared/ui/container";
import { useAppForm } from "@/shared/ui/form";
import { LogoIcon } from "@/shared/ui/logo";

import { appConfig } from "@/config/app.config";

export function CreateAnAccountForm({
  redirectTo = "/dashboard",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPending } = useAuth();

  const signUpMutation = useMutation({
    mutationFn: async (values: { email: string; name: string; password: string }) => {
      const result = await authClient.signUp.email(values);

      if (!result.data) {
        throw new Error(result.error?.message ?? m.auth__sign_up_failed());
      }

      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message || m.auth__sign_up_failed());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(getAuthUserQueryOptions());
      await navigate({ to: redirectTo });
      toast.success(m.auth__sign_up_successful());
    }
  });

  const form = useAppForm({
    defaultValues: {
      confirmPassword: "",
      email: "",
      name: "",
      password: ""
    },
    onSubmit: ({ value }) => {
      signUpMutation.mutate({
        email: value.email,
        name: value.name,
        password: value.password
      });
    },
    validators: {
      onSubmit: createSignUpSchema({
        invalidEmail: () => m.auth__invalid_email(),
        nameMinLength: () => m.auth__name_min_length(),
        passwordMinLength: () => m.auth__password_min_length(),
        passwordsNoMatch: () => m.auth__passwords_no_match()
      })
    }
  });

  if (isPending) {
    return <Spinner />;
  }

  return (
    <Container className={cn("flex max-w-md flex-col gap-6", className)} {...props}>
      <form
        aria-busy={signUpMutation.isPending}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <Link to="/" className="flex flex-col items-center gap-2 font-medium">
              <LogoIcon className="flex size-8 items-center justify-center rounded-md" />
              <span className="sr-only">{appConfig.site.shortName}</span>
            </Link>
            <h1 className="text-xl font-bold">{m.auth__create_account_title()}</h1>
            <FieldDescription>
              {m.auth__already_have_account()}{" "}
              <Link to="/sign-in" search={{ redirect: redirectTo }}>
                {m.auth__sign_in_link()}
              </Link>
            </FieldDescription>
          </div>

          <form.AppField name="name">
            {(field) => (
              <field.TextInputField
                autoComplete="name"
                label={m.auth__name_label()}
                placeholder={m.auth__name_placeholder()}
                readOnly={signUpMutation.isPending}
              />
            )}
          </form.AppField>

          <form.AppField name="email">
            {(field) => (
              <field.EmailInputField
                label={m.auth__email_label()}
                placeholder={m.auth__email_placeholder()}
                readOnly={signUpMutation.isPending}
              />
            )}
          </form.AppField>

          <form.AppField name="password">
            {(field) => (
              <field.PasswordInputField
                autoComplete="new-password"
                label={m.auth__password_label()}
                readOnly={signUpMutation.isPending}
              />
            )}
          </form.AppField>

          <form.AppField name="confirmPassword">
            {(field) => (
              <field.PasswordInputField
                autoComplete="new-password"
                label={m.auth__confirm_password_label()}
                readOnly={signUpMutation.isPending}
              />
            )}
          </form.AppField>

          <form.AppForm>
            <form.SubmitButton
              disabled={signUpMutation.isSuccess}
              label={m.auth__create_account()}
              pending={signUpMutation.isPending}
              pendingLabel={m.auth__creating_account()}
            />
          </form.AppForm>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        {m.auth__terms_agreement()} <Link to="/terms-of-service">{m.auth__terms_of_service()}</Link>{" "}
        {m.auth__and()} <Link to="/privacy-policy">{m.auth__privacy_policy()}</Link>.
      </FieldDescription>
    </Container>
  );
}
