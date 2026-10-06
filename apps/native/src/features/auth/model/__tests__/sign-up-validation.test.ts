import { describe, expect, it } from "vite-plus/test";

import { createSignUpValidation } from "@/features/auth/model/sign-up-validation";

const validInput = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "secure-password",
  confirmPassword: "secure-password"
};

describe("createSignUpValidation", () => {
  it("accepts matching passwords and trims pasted identity fields", () => {
    const result = createSignUpValidation().safeParse({
      ...validInput,
      name: "  Ada Lovelace  ",
      email: " ada@example.com "
    });

    expect(result).toMatchObject({
      success: true,
      data: { name: "Ada Lovelace", email: "ada@example.com" }
    });
  });

  it.each([
    [{ ...validInput, name: "A" }, "name"],
    [{ ...validInput, email: "invalid" }, "email"],
    [{ ...validInput, password: "short", confirmPassword: "short" }, "password"],
    [{ ...validInput, confirmPassword: "different-password" }, "confirmPassword"]
  ])("rejects invalid %s at %s", (input, field) => {
    const result = createSignUpValidation().safeParse(input);

    expect(result.success ? [] : result.error.issues.map((issue) => issue.path[0])).toContain(
      field
    );
  });
});
