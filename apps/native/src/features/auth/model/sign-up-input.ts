import { type Locale } from "@/features/locale";

export function createSignUpInput(
  values: { name: string; email: string; password: string },
  locale: Locale
) {
  return { ...values, name: values.name.trim(), locale };
}
