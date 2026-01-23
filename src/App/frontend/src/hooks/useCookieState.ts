import { useCallback, useSyncExternalStore } from 'react';

import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';

const COOKIE_EXPIRY_DAYS = 365;

type CookieName = 'lang';
type ScopeKey = string | number | boolean | null | undefined;

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

function isNotNullUndefinedOrEmpty(key: ScopeKey) {
  return key != null && (typeof key !== 'string' || !!key.length);
}

function getFullCookieKey(cookieName: CookieName, scopeKeys: ScopeKey[]): string {
  return [window.org, window.app, cookieName, ...scopeKeys].filter(isNotNullUndefinedOrEmpty).join('_');
}

export function useCookieState<T>(
  [cookieName, ...scopeKeys]: [CookieName, ...ScopeKey[]],
  defaultValue: T,
): [T, (value: T) => void] {
  const fullCookieKey = getFullCookieKey(cookieName, scopeKeys);

  const getSnapshot = useCallback(() => {
    const value = CookieStorage.getItem<T>(fullCookieKey);
    return value ?? defaultValue;
  }, [fullCookieKey, defaultValue]);

  const cookieValue = useSyncExternalStore(subscribe, getSnapshot);

  const setCookieValue = useCallback(
    (newValue: T) => {
      if (newValue === null) {
        CookieStorage.removeItem(fullCookieKey);
      } else {
        CookieStorage.setItem(fullCookieKey, newValue, COOKIE_EXPIRY_DAYS);
      }
      emitChange();
    },
    [fullCookieKey],
  );

  return [cookieValue, setCookieValue];
}
