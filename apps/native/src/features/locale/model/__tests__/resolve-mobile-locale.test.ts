import { describe, expect, it } from "vite-plus/test";

import { resolveMobileLocale } from "@/features/locale/model/resolve-mobile-locale";

describe("resolveMobileLocale", () => {
  it("uses English despite a saved non-English choice", () => {
    expect(resolveMobileLocale(undefined, "de", ["de"])).toBe("en");
  });

  it("uses English regardless of device language", () => {
    expect(resolveMobileLocale(undefined, null, ["fr", "de"])).toBe("en");
  });

  it("falls back to English when no language is supported", () => {
    expect(resolveMobileLocale(undefined, "fr", ["fr", null])).toBe("en");
  });

  it("uses English for an account with a non-English preference", () => {
    expect(resolveMobileLocale("de", "en", ["de"])).toBe("en");
  });

  it("uses English for an account with no locale instead of guest or device preferences", () => {
    expect(resolveMobileLocale(null, "de", ["de"])).toBe("en");
  });
});
