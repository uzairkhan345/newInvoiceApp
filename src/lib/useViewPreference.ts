"use client";

import { useCallback, useSyncExternalStore } from "react";

export type DirectoryView = "workspace" | "table" | "cards";

/**
 * Shared by every directory page with a Table/Cards toggle (Projects,
 * Parties) — persists the choice to localStorage under `storageKey` and
 * keeps every mounted instance of the same key in sync.
 *
 * Uses `useSyncExternalStore`, not a `useState` lazy initializer or a plain
 * `useEffect` + `setState`: reading localStorage during the initial state
 * computation makes the client's first render disagree with the server's
 * (which never sees localStorage), causing a hydration mismatch — the
 * bug this hook was introduced to fix in ProjectsDirectory.tsx. `notify`
 * exists because `selectView` below writes directly to localStorage rather
 * than dispatching a native `storage` event, which only fires cross-tab, not
 * for the tab that made the write.
 */
const listenersByKey = new Map<string, Set<() => void>>();

function listenersFor(key: string): Set<() => void> {
  let set = listenersByKey.get(key);
  if (!set) {
    set = new Set();
    listenersByKey.set(key, set);
  }
  return set;
}

export function useViewPreference(
  storageKey: string,
  defaultView: DirectoryView = "table",
): [DirectoryView, (next: DirectoryView) => void] {
  const subscribe = useCallback(
    (callback: () => void) => {
      const listeners = listenersFor(storageKey);
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    [storageKey],
  );

  const getSnapshot = useCallback((): DirectoryView => {
    const stored = window.localStorage.getItem(storageKey);
    return stored === "cards" || stored === "table" || stored === "workspace"
      ? stored
      : defaultView;
  }, [defaultView, storageKey]);

  const getServerSnapshot = useCallback(
    (): DirectoryView => defaultView,
    [defaultView],
  );

  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setView = useCallback(
    (next: DirectoryView) => {
      window.localStorage.setItem(storageKey, next);
      listenersFor(storageKey).forEach((callback) => callback());
    },
    [storageKey],
  );

  return [view, setView];
}
