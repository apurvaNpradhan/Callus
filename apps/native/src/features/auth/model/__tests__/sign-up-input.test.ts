import { describe, expect, it } from "vite-plus/test";

import { createSignUpInput } from "@/features/auth/model/sign-up-input";

describe("createSignUpInput", () => {
  it("seeds the new account with English", () => {
    expect(
      createSignUpInput(
        { name: "  Ada Lovelace  ", email: "ada@example.com", password: "secure-password" },
        "en"
      )
    ).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "secure-password",
      locale: "en"
    });
  });
});
