import { isNotNullUndefinedOrEmpty } from 'src/utils/listUtils';

const MILLISECONDS_PER_DAY = 86400000;

export class CookieStorage {
  static setItem<T>(key: string, value: T, expiresInDays?: number): void {
    const encodedKeyValue = `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`;
    const expires = expiresInDays
      ? `expires=${new Date(Date.now() + expiresInDays * MILLISECONDS_PER_DAY).toUTCString()}`
      : '';
    // A Secure cookie is only stored over https, so a page served over plain http (localtest) must not ask for it.
    const secure = window.location.protocol === 'https:' ? 'Secure' : '';

    const cookieString = [encodedKeyValue, expires, `path=/${window.org}/${window.app}`, 'SameSite=Lax', secure]
      .filter(isNotNullUndefinedOrEmpty)
      .join('; ');

    document.cookie = cookieString;
  }

  static getItem<T>(key: string): T | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`));
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(decodeURIComponent(match[1]));
    } catch {
      return null;
    }
  }

  static removeItem(key: string): void {
    document.cookie = `${encodeURIComponent(key)}=; max-age=0; path=/${window.org}/${window.app}`;
  }
}
