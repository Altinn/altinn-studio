import { isNotNullUndefinedOrEmpty } from 'src/utils/listUtils';
import { isLocalEnvironment } from 'src/utils/urls/urlHelper';

const MILLISECONDS_PER_DAY = 86400000;

export class CookieStorage {
  static setItem<T>(key: string, value: T, expiresInDays?: number): void {
    const encodedKeyValue = `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`;
    const expires = expiresInDays
      ? `expires=${new Date(Date.now() + expiresInDays * MILLISECONDS_PER_DAY).toUTCString()}`
      : '';
    const secure = isLocalEnvironment(globalThis.location.host) ? '' : 'Secure';

    const cookieString = [encodedKeyValue, expires, `path=/${globalThis.org}/${globalThis.app}`, 'SameSite=Lax', secure]
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
    document.cookie = `${encodeURIComponent(key)}=; max-age=0; path=/${globalThis.org}/${globalThis.app}`;
  }
}
