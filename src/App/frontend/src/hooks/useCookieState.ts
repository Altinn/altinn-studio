import { useCallback, useSyncExternalStore } from 'react';

import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';

const COOKIE_EXPIRY_DAYS = 365;

type CookieName = 'selectedLanguage';

let listeners: Array<() => void> = [];

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getFullKey(key: CookieName): string {
  return `${window.org}_${window.app}_${key}`;
}

export function useCookieState<T>(cookieName: CookieName, defaultValue: T): [T, (value: T) => void] {
  const fullKey = getFullKey(cookieName);

  const getSnapshot = useCallback(() => {
    const value = CookieStorage.getItem<T>(fullKey);
    return value ?? defaultValue;
  }, [fullKey, defaultValue]);

  const cookieValue = useSyncExternalStore(subscribe, getSnapshot);

  const setCookieValue = useCallback(
    (newValue: T) => {
      if (newValue === null) {
        CookieStorage.removeItem(fullKey);
      } else {
        CookieStorage.setItem(fullKey, newValue, COOKIE_EXPIRY_DAYS);
      }
      emitChange();
    },
    [fullKey],
  );

  return [cookieValue, setCookieValue];
}
