import { describe, expect, it } from "vite-plus/test";

import { generateAppSeo } from "@/shared/lib/seo";

import { appConfig } from "@/config/app.config";

describe("generateAppSeo", () => {
  it("includes the configured base path in canonical URLs", () => {
    const result = generateAppSeo({
      canonicalPath: "/privacy-policy"
    });

    const canonicalLink = result.links?.find((link) => link.rel === "canonical");
    const expectedPath = `${appConfig.site.basePath.replace(/\/+$/, "")}/privacy-policy`;

    expect(canonicalLink?.href).toBe(`${appConfig.site.baseUrl}${expectedPath}`);
  });

  it("formats title with site template", () => {
    const result = generateAppSeo({
      title: "Dashboard"
    });

    const titleTag = result.meta?.find((tag) => "title" in tag);

    expect(titleTag).toEqual({
      title: `Dashboard | ${appConfig.site.shortName}`
    });
  });

  it("assembles robots directives correctly", () => {
    const result = generateAppSeo({
      robots: { follow: false, index: false }
    });

    const robotsTag = result.meta?.find((tag) => "name" in tag && tag.name === "robots");

    expect(robotsTag).toEqual({
      content: "noindex, nofollow",
      name: "robots"
    });
  });
});
