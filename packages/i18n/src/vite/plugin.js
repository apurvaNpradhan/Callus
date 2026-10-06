import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { paraglideVitePlugin as rawParaglideVitePlugin } from "@inlang/paraglide-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const I18N_ROOT = resolve(__dirname, "../..");

/**
 * @typedef {Parameters<typeof rawParaglideVitePlugin>[0]} PluginOptions
 */

/**
 * @param {Partial<PluginOptions>} [options]
 * @returns {ReturnType<typeof rawParaglideVitePlugin>} a plugin for vite that integrates Paraglide for i18n support
 */
export function paraglideVitePlugin(options) {
  const pluginOptions = options ?? {};

  /** @type {PluginOptions} */
  const DEFAULT_OPTIONS = {
    cookieName: "LOCALE",
    outdir: resolve(I18N_ROOT, "src/paraglide"),
    outputStructure: "message-modules",
    project: resolve(I18N_ROOT, "project.inlang"),
    strategy: ["cookie", "preferredLanguage", "baseLocale"]
  };

  return rawParaglideVitePlugin({ ...DEFAULT_OPTIONS, ...pluginOptions });
}
