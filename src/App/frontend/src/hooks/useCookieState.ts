import { useCallback, useSyncExternalStore } from 'react';

import { useProfile } from 'src/features/profile/ProfileProvider';
import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';
import { isNotNullUndefinedOrEmpty } from 'src/utils/listUtils';

const COOKIE_EXPIRY_DAYS = 365;

type CookieName = 'lang';

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

export function useCookieState<T>(cookieName: CookieName, defaultValue: T): [T, (value: T) => void] {
  const profile = useProfile();
  const partyId = profile?.partyId;
  const fullCookieKey = [cookieName, partyId].filter(isNotNullUndefinedOrEmpty).join('_');

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
