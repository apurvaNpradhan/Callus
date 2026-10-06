import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { type PropsWithChildren } from "react";
import { AppState } from "react-native";

import { setLocale } from "@callus/i18n/native/runtime";

import { authClient } from "@/shared/api/auth-client";

import {
  resolveMobileLocale,
  type MobileLocale
} from "@/features/locale/model/resolve-mobile-locale";

export type Locale = MobileLocale;

type LocaleContextValue = {
  locale: Locale;
  setPreferredLocale: (locale: Locale) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const storageKey = "callus-locale";

export function LocaleProvider({ children }: PropsWithChildren) {
  const { data: session, isPending } = authClient.useSession();
  const accountId = session?.user.id ?? null;
  const accountLocale = session?.user.locale;
  const latestAccountLocale = useRef(accountLocale);

  const [resolvedLocale, setResolvedLocale] = useState<{
    accountId: string | null;
    locale: Locale;
  } | null>(null);

  const currentAccountId = useRef(accountId);
  const pendingPreferenceUpdates = useRef(0);
  const revision = useRef(0);

  useEffect(() => {
    currentAccountId.current = accountId;
    latestAccountLocale.current = accountLocale;
  }, [accountId, accountLocale]);

  useEffect(() => {
    if (isPending) return;

    const currentRevision = ++revision.current;
    const currentUserId = accountId;

    void (async () => {
      let savedLocale: string | null = null;
      let resolvedAccountLocale = latestAccountLocale.current;

      if (currentUserId) {
        try {
          const result = await authClient.getSession({ query: { disableCookieCache: true } });

          if (result.data?.user.id === currentUserId) {
            resolvedAccountLocale = result.data.user.locale;
          }
        } catch {
          // The restored session locale is the offline fallback.
        }
      } else {
        savedLocale = await AsyncStorage.getItem(storageKey).catch(() => null);
      }

      const initialLocale = resolveMobileLocale(
        currentUserId ? (resolvedAccountLocale ?? null) : undefined,
        savedLocale,
        getLocales().map(({ languageCode }) => languageCode)
      );

      await setLocale(initialLocale, { reload: false });

      if (revision.current === currentRevision && currentAccountId.current === currentUserId) {
        setResolvedLocale({ accountId: currentUserId, locale: initialLocale });
      }
    })();
  }, [accountId, isPending]);

  useEffect(() => {
    if (isPending || !accountId) return;

    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || pendingPreferenceUpdates.current > 0) return;

      const currentRevision = ++revision.current;
      void authClient
        .getSession({ query: { disableCookieCache: true } })
        .then(async (result) => {
          if (
            result.data?.user.id !== accountId ||
            revision.current !== currentRevision ||
            currentAccountId.current !== accountId
          ) {
            return;
          }

          const nextLocale = resolveMobileLocale(result.data.user.locale ?? null, null, []);
          await setLocale(nextLocale, { reload: false });

          if (revision.current === currentRevision) {
            setResolvedLocale({ accountId, locale: nextLocale });
          }
        })
        .catch(() => {
          // Keep the current language when a foreground refresh cannot reach the server.
        });
    });

    return () => subscription.remove();
  }, [accountId, isPending]);

  const setPreferredLocale = useCallback(
    async (nextLocale: Locale) => {
      const currentRevision = ++revision.current;

      if (accountId) {
        pendingPreferenceUpdates.current += 1;

        try {
          const result = await authClient.updateUser({ locale: nextLocale });

          if (result.error) throw new Error(result.error.message ?? "Unable to update language");
        } finally {
          pendingPreferenceUpdates.current -= 1;
        }

        if (currentAccountId.current !== accountId || revision.current !== currentRevision) return;
      } else {
        await AsyncStorage.setItem(storageKey, nextLocale);

        if (currentAccountId.current !== null || revision.current !== currentRevision) return;
      }

      await setLocale(nextLocale, { reload: false });

      if (revision.current === currentRevision) {
        setResolvedLocale({ accountId, locale: nextLocale });
      }
    },
    [accountId]
  );

  if (!resolvedLocale || resolvedLocale.accountId !== accountId) return null;

  return (
    <LocaleContext.Provider value={{ locale: resolvedLocale.locale, setPreferredLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const value = useContext(LocaleContext);

  if (!value) throw new Error("useLocale must be used inside LocaleProvider");

  return value;
}
