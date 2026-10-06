import { z } from "zod";

import { SUPPORTED_LOCALES } from "#@/i18n/constants";

export const SupportedLocaleSchema = z.enum(SUPPORTED_LOCALES);

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
