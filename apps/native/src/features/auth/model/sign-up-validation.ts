import { createSignUpSchema } from "@callus/core/auth";
import * as m from "@callus/i18n/native/messages";

/** Builds the sign-up form schema at render time so validation messages use the active locale. */
export function createSignUpValidation() {
  return createSignUpSchema({
    invalidEmail: () => m.auth__invalid_email(),
    nameMinLength: () => m.auth__name_min_length(),
    passwordMinLength: () => m.auth__password_min_length(),
    passwordsNoMatch: () => m.auth__passwords_no_match()
  });
}
