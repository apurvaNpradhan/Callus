import { z } from "zod";

import { AUTH_CONSTRAINTS } from "#@/auth/constants";
import { SupportedLocaleSchema } from "#@/i18n/types";

export type SignUpValidationMessages = {
  invalidEmail?: () => string;
  nameMinLength?: () => string;
  passwordMinLength?: () => string;
  passwordsNoMatch?: () => string;
};

export function createSignUpSchema(messages?: SignUpValidationMessages) {
  return z
    .object({
      confirmPassword: z.string(),
      email: z
        .string()
        .trim()
        .pipe(
          z.email({
            error: messages?.invalidEmail ?? "Invalid email address"
          })
        ),
      locale: SupportedLocaleSchema.optional(),
      name: z
        .string()
        .trim()
        .min(AUTH_CONSTRAINTS.NAME_MIN_LENGTH, {
          error:
            messages?.nameMinLength ??
            `Name must be at least ${AUTH_CONSTRAINTS.NAME_MIN_LENGTH} characters`
        }),
      password: z.string().min(AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH, {
        error:
          messages?.passwordMinLength ??
          `Password must be at least ${AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH} characters`
      })
    })
    .refine((values) => values.password === values.confirmPassword, {
      error: messages?.passwordsNoMatch ?? "Passwords do not match",
      path: ["confirmPassword"]
    });
}

export const BaseSignUpInputSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  locale: SupportedLocaleSchema.optional(),
  name: z.string().trim().min(AUTH_CONSTRAINTS.NAME_MIN_LENGTH),
  password: z.string().min(AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH)
});

export type BaseSignUpInput = z.infer<typeof BaseSignUpInputSchema>;
