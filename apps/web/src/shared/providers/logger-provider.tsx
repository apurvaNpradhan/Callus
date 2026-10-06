import { createContext, useContext, useEffect } from "react";

import { clearIdentity, log, setIdentity } from "@callus/logger/client";

import { useAuth } from "@/shared/lib/auth/tanstack-start/hooks";

type LoggerContextValue = {
  logger: typeof log;
};

const LoggerContext = createContext<LoggerContextValue | null>(null);

export function LoggerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      setIdentity({ user: { id: user.id } });
    } else {
      setIdentity({ user: { id: "anonymous" } });
    }

    return () => {
      clearIdentity();
    };
  }, [user]);

  return <LoggerContext.Provider value={{ logger: log }}>{children}</LoggerContext.Provider>;
}

export function useLogger(): typeof log {
  const context = useContext(LoggerContext);

  if (!context) {
    log.warn("logger-provider", "Called outside of LoggerProvider");

    return log;
  }

  return context.logger;
}
