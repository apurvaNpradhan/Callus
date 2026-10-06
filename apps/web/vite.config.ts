import { resolve } from "node:path";

import { ohImage } from "@lonik/oh-image/plugin";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite-plus";

import { ENV_WEB_ISOMORPHIC } from "@callus/env/web/env.isomorphic";
import { ENV_WEB_SERVER } from "@callus/env/web/env.server";
import { paraglideVitePlugin } from "@callus/i18n/vite/plugin";

import { type FileRouteTypes } from "@/routeTree.gen";

/**
 * Keep the prerender route list explicit so TanStack Start receives typed paths with
 * trailing slashes and does not follow root redirects repeatedly during the build.
 */
const ROUTES_TO_PRERENDER: FileRouteTypes["fullPaths"][] = [
  "/",
  "/sign-in",
  "/sign-up",
  "/sitemap.xml",
  "/robots.txt"
];

const PAGES_PRERENDER_CONFIG = ROUTES_TO_PRERENDER.map((path) => {
  return {
    path,
    prerender: { enabled: true }
  };
});

function resolveWebBasePath(webUrl: string): string {
  try {
    return new URL(webUrl).pathname || "/";
  } catch (cause) {
    throw new Error("Unable to resolve the validated web URL base path", { cause });
  }
}

const webBasePath = resolveWebBasePath(ENV_WEB_ISOMORPHIC.VITE_WEB_URL);

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        banner: '"use client";'
      }
    }
  },
  run: {
    tasks: {
      build: {
        command: "cross-env IS_BUILD=true pnpm dotenvx run -f ../../packages/env/.env -- vp build",
        dependsOn: ["@callus/i18n#build"],
        cache: {
          // These public URL and image settings are build inputs for the web bundle. Auth and database secrets are runtime-only.
          env: [
            "NODE_ENV",
            "VITE_SERVER_URL",
            "VITE_WEB_URL",
            "VITE_IMGPROXY_URL",
            "VITE_IMGPROXY_SIGNATURE",
            "SOURCE_COMMIT"
          ]
        }
      }
    }
  },

  /**
   * FIXME: This is needed for prerendering to work in Docker Compose builds
   * @see {@link https://github.com/TanStack/router/issues/6275}
   */
  preview: {
    host: "127.0.0.1"
  },
  base: webBasePath,
  // Restart the dev server when env files in this directory change
  envDir: resolve(import.meta.dirname, "../../packages/env"),
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src")
    },
    tsconfigPaths: true
  },
  define: {
    __BUILD_NODE_ENV__: JSON.stringify(ENV_WEB_SERVER.NODE_ENV),
    __BUILD_SOURCE_COMMIT__: JSON.stringify(ENV_WEB_SERVER.SOURCE_COMMIT)
  },
  server: {
    port: 3001
  },
  plugins: [
    devtools({
      consolePiping: { enabled: false }
    }),
    mdx(),
    tanstackStart({
      pages: PAGES_PRERENDER_CONFIG,
      prerender: {
        enabled: true,
        // Only prerender paths defined in the PAGES_PRERENDER_CONFIG object
        autoStaticPathsDiscovery: false,
        // Only prerender the routes explicitly listed in PAGES_PRERENDER_CONFIG.
        crawlLinks: false
      },
      server: {
        build: {
          // Don't allow changing of process.env.NODE_ENV at runtime
          staticNodeEnv: true
        }
      }
    }),
    viteReact({ compiler: true }),
    paraglideVitePlugin(),
    /** @see {@link https://tanstack.com/start/latest/docs/framework/react/guide/hosting} */
    nitro({
      baseURL: webBasePath,
      routeRules: {
        "/**": {
          headers: {
            "Content-Security-Policy": "frame-ancestors 'none'",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY"
          }
        }
      },
      // A full script/style CSP needs nonce support for TanStack's SSR and inline theme scripts.
      // HSTS belongs at the HTTPS ingress; COOP needs review before adding popup-based auth.
      // FIXME: Remove this when Nitro/Rolldown preserves initialization order across server chunks, see https://github.com/rolldown/rolldown/issues/10747
      inlineDynamicImports: true,
      /**
       * We need to add this or else we will get `Error: Cannot find module 'react'` during prod.
       * FIXME: I haven't found a fix or related issue yet, but this is where I got the idea to trace the deps:
       * @see {@link https://github.com/nuxt/nuxt/issues/20773}
       * Recent Discord discussion on the matter
       * @see {@link https://discord.com/channels/719702312431386674/1490005967067414608}
       */
      traceDeps: ["react", "react-dom"]
    }),
    tailwindcss(),
    ohImage({
      pl_show: true,
      transforms: {
        format: "webp",
        quality: 80
      }
    })
  ]
});
