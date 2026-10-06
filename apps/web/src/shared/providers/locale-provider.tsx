import * as React from "react";

import { getLocale, type locales, setLocale } from "@callus/i18n/runtime";

type Locale = (typeof locales)[number];

type LocaleContextValue = {
  locale: Locale;
  switchLocale: (locale: Locale) => void;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setCurrentLocale] = React.useState<Locale>(() => getLocale());

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const switchLocale = React.useCallback((nextLocale: Locale) => {
    void setLocale(nextLocale, { reload: false });
    setCurrentLocale(nextLocale);
    document.documentElement.lang = nextLocale;
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, switchLocale }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = React.useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
