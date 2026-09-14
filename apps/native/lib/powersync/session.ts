import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { powerSyncConnector } from "./connector";
import { initializePowerSyncDatabase, powerSync } from "./database";

const ownerKey = "callus-powersync-owner";
let transition = Promise.resolve();

async function readOwner(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(ownerKey);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(ownerKey);
}

async function writeOwner(value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    try {
      if (value === null) localStorage.removeItem(ownerKey);
      else localStorage.setItem(ownerKey, value);
    } catch {
      // privacy mode etc. — treat as best-effort; the DB is still cleared per-user
    }
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(ownerKey);
  else await SecureStore.setItemAsync(ownerKey, value);
}

async function transitionPowerSyncOwner(
  userId: string | null,
  offline: boolean,
): Promise<string | null> {
  if (!powerSync) return null;
  const storedOwner = await readOwner();
  await initializePowerSyncDatabase();

  if (offline) {
    if (powerSync.connected || powerSync.connecting) await powerSync.disconnect();
    return storedOwner ?? null;
  }

  if (!userId) {
    if (storedOwner !== null || powerSync.connected || powerSync.connecting) {
      await powerSync.disconnectAndClear();
    }
    await writeOwner(null);
    return null;
  }

  if (storedOwner !== userId) {
    if (storedOwner !== null) {
      await powerSync.disconnectAndClear();
    } else {
      const customRows = await powerSync.get<{ count: number }>(
        "SELECT count(*) AS count FROM exercise WHERE user_id IS NOT NULL",
      );
      if (customRows.count > 0) await powerSync.disconnectAndClear();
    }
    await writeOwner(userId);
  }

  if (!powerSync.connected && !powerSync.connecting) {
    void powerSync.connect(powerSyncConnector).catch((error: unknown) => {
      console.log("PowerSync connection failed", error);
    });
  }
  return userId;
}

function queuePowerSyncOwnerTransition(userId: string | null, offline: boolean) {
  const next = transition.then(() => transitionPowerSyncOwner(userId, offline));
  transition = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function usePowerSyncSession(userId: string | null | undefined, offline = false) {
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  const [errorUserId, setErrorUserId] = useState<string | null>(null);
  const [error, setError] = useState<Error>();
  const [completedTransition, setCompletedTransition] = useState<string>();
  const transitionKey = `${userId ?? "pending"}:${offline}`;

  useEffect(() => {
    if (userId === undefined && !offline) return;
    let cancelled = false;
    void queuePowerSyncOwnerTransition(userId ?? null, offline)
      .then((activeUserId) => {
        if (cancelled) return; // a newer session effect superseded this one
        setReadyUserId(activeUserId);
        setErrorUserId(activeUserId);
        setError(undefined);
        setCompletedTransition(transitionKey);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const nextError = cause instanceof Error ? cause : new Error(String(cause));
        setErrorUserId(userId ?? null);
        setError(nextError);
        console.log("PowerSync session transition failed", nextError);
      });
    return () => {
      cancelled = true;
    };
  }, [offline, transitionKey, userId]);

  const transitioned = completedTransition === transitionKey;
  return {
    activeUserId: transitioned && (offline || readyUserId === userId) ? readyUserId : null,
    error: errorUserId === (userId ?? null) ? error : undefined,
    ready: transitioned && (offline || readyUserId === userId),
  };
}
