import { baseLocale, locales } from "@callus/i18n/native/runtime";

export type MobileLocale = (typeof locales)[number];

/** Resolve an account language first, then guest storage, device preferences, and English. */
export function resolveMobileLocale(
  accountLocale: string | null | undefined,
  savedLocale: string | null,
  deviceLanguages: readonly (string | null)[]
): MobileLocale {
  if (accountLocale !== undefined) {
    return locales.find((locale) => locale === accountLocale) ?? baseLocale;
  }

  const savedMatch = locales.find((locale) => locale === savedLocale);

  if (savedMatch) return savedMatch;

  for (const language of deviceLanguages) {
    const baseLanguage = language?.split("-")[0];
    const deviceMatch = locales.find((locale) => locale === baseLanguage);

    if (deviceMatch) return deviceMatch;
  }

  return baseLocale;
}
