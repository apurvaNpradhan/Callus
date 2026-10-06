import { describe, expect, it } from "vite-plus/test";

import { AUTH_CONSTRAINTS } from "#@/auth/constants";
import { createSignUpSchema } from "#@/auth/types";
import { SUPPORTED_LOCALES } from "#@/i18n/constants";

describe("core auth validation", () => {
  it("validates compliant sign up input", () => {
    const schema = createSignUpSchema();

    const result = schema.safeParse({
      confirmPassword: "password123",
      email: "test@example.com",
      locale: "en",
      name: "Jane Doe",
      password: "password123"
    });

    expect(result.success).toBe(true);
  });

  it("fails when password is too short", () => {
    const schema = createSignUpSchema();

    const result = schema.safeParse({
      confirmPassword: "short",
      email: "test@example.com",
      name: "Jane",
      password: "short"
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain(
      `at least ${AUTH_CONSTRAINTS.PASSWORD_MIN_LENGTH}`
    );
  });

  it("fails when passwords do not match", () => {
    const schema = createSignUpSchema({
      passwordsNoMatch: () => "Mismatch!"
    });

    const result = schema.safeParse({
      confirmPassword: "different-password",
      email: "test@example.com",
      name: "Jane",
      password: "password123"
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Mismatch!");
  });

  it("exports valid supported locales", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "de"]);
  });
});
