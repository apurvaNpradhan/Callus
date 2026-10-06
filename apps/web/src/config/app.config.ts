import { ENV_WEB_ISOMORPHIC } from "@callus/env/web/env.isomorphic";

let siteUrl: URL;

try {
  siteUrl = new URL(ENV_WEB_ISOMORPHIC.VITE_WEB_URL);
} catch {
  throw new Error("Callus web URL is invalid");
}

const emailSupport = `support@${siteUrl.host}`;

// We load it in vite.config.ts because they are originally from ENV_WEB_SERVER variables
declare const __BUILD_SOURCE_COMMIT__: string;

export const appConfig = Object.freeze({
  site: {
    author: "tsu!moe",
    basePath: siteUrl.pathname,
    baseUrl: siteUrl.origin,
    description:
      "Plan meals, track macros, follow workouts and programs, and see your progress in one health app.",
    emailSupport,
    jurisdictionCountry: "the Republic of the Philippines",
    longName: "Callus",
    serverLocation: "Japan",
    shortName: "Callus",
    url: ENV_WEB_ISOMORPHIC.VITE_WEB_URL,
    version: __BUILD_SOURCE_COMMIT__
  }
});
