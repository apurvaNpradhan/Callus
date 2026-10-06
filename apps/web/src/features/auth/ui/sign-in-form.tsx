import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

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

export function SignInForm({
  redirectTo = "/dashboard",
  className,
  ...props
}: React.ComponentProps<"div"> & { redirectTo?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPending } = useAuth();

  const signInMutation = useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      const result = await authClient.signIn.email(values);

      if (!result.data) {
        throw new Error(result.error?.message ?? m.auth__sign_in_failed());
      }

      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message || m.auth__sign_in_failed());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(getAuthUserQueryOptions());
      await navigate({ to: redirectTo });
      toast.success(m.auth__sign_in_successful());
    }
  });

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: ""
    },
    onSubmit: ({ value }) => signInMutation.mutate(value),
    validators: {
      onSubmit: z.object({
        email: z.email({ error: () => m.auth__invalid_email() }),
        password: z.string().min(8, { error: () => m.auth__password_min_length() })
      })
    }
  });

  if (isPending) {
    return <Spinner />;
  }

  return (
    <Container className={cn("flex max-w-md flex-col gap-6", className)} {...props}>
      <form
        aria-busy={signInMutation.isPending}
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
            <h1 className="text-xl font-bold">{m.auth__sign_in_title()}</h1>
            <FieldDescription>
              {m.auth__sign_in_no_account()}{" "}
              <Link to="/sign-up" search={{ redirect: redirectTo }}>
                {m.auth__sign_in_create_account()}
              </Link>
            </FieldDescription>
          </div>

          <form.AppField name="email">
            {(field) => (
              <field.EmailInputField
                label={m.auth__email_label()}
                placeholder={m.auth__email_placeholder()}
                readOnly={signInMutation.isPending}
              />
            )}
          </form.AppField>

          <form.AppField name="password">
            {(field) => (
              <field.PasswordInputField
                autoComplete="current-password"
                label={m.auth__password_label()}
                readOnly={signInMutation.isPending}
              />
            )}
          </form.AppField>

          <form.AppForm>
            <form.SubmitButton
              disabled={signInMutation.isSuccess}
              label={m.auth__sign_in()}
              pending={signInMutation.isPending}
              pendingLabel={m.auth__signing_in()}
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
