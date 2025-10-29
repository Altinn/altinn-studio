import type { CookieOptions } from './types';

export class CookieStorage {
  private static readonly MILLISECONDS_PER_DAY = 86400000;

  public static setItem<T>(key: string, value: T, options: CookieOptions = {}): void {
    if (value === undefined || value === null) {
      console.warn(`Cannot set cookie "${key}" with undefined or null value`);
      return;
    }

    try {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(JSON.stringify(value));
      const cookieString = CookieStorage.buildCookieString(encodedKey, encodedValue, options);

      document.cookie = cookieString;
    } catch (error) {
      console.error(`Failed to set cookie "${key}":`, error);
      throw error;
    }
  }

  public static getItem<T>(key: string): T | null {
    try {
      const encodedKey = encodeURIComponent(key);
      const cookies = document.cookie.split(';');
      const cookieValue = CookieStorage.findCookieValue(encodedKey, cookies);

      if (!cookieValue) {
        return null;
      }

      const decodedValue = decodeURIComponent(cookieValue);
      return JSON.parse(decodedValue) as T;
    } catch (error) {
      console.warn(`Failed to parse cookie "${key}":`, error);
      return null;
    }
  }

  public static removeItem(
    key: string,
    options: Pick<CookieOptions, 'path' | 'domain'> = {},
  ): void {
    const encodedKey = encodeURIComponent(key);
    const cookieString = CookieStorage.buildRemoveCookieString(encodedKey, options);
    document.cookie = cookieString;
  }

  public static getAllKeys(): string[] {
    try {
      return document.cookie.split(';').map(CookieStorage.extractCookieKey).filter(Boolean);
    } catch (error) {
      console.warn('Failed to get cookie keys:', error);
      return [];
    }
  }

  private static toExpiresDate(expires: Date | number): Date {
    return typeof expires === 'number'
      ? new Date(Date.now() + expires * CookieStorage.MILLISECONDS_PER_DAY)
      : expires;
  }

  private static serializeExpires(expires?: Date | number): string {
    return expires ? `; expires=${CookieStorage.toExpiresDate(expires).toUTCString()}` : '';
  }

  private static serializePath(path = '/'): string {
    return `; path=${path}`;
  }

  private static serializeDomain(domain?: string): string {
    return domain ? `; domain=${domain}` : '';
  }

  private static serializeSecure(secure?: boolean): string {
    return secure ? '; secure' : '';
  }

  private static serializeSameSite(sameSite: CookieOptions['sameSite'] = 'Lax'): string {
    return `; samesite=${sameSite}`;
  }

  private static buildCookieString(
    encodedKey: string,
    encodedValue: string,
    options: CookieOptions,
  ): string {
    return [
      `${encodedKey}=${encodedValue}`,
      CookieStorage.serializeExpires(options.expires),
      CookieStorage.serializePath(options.path),
      CookieStorage.serializeDomain(options.domain),
      CookieStorage.serializeSecure(options.secure),
      CookieStorage.serializeSameSite(options.sameSite),
    ]
      .filter(Boolean)
      .join('');
  }

  private static buildRemoveCookieString(
    encodedKey: string,
    options: Pick<CookieOptions, 'path' | 'domain'>,
  ): string {
    return [
      `${encodedKey}=`,
      '; max-age=0',
      CookieStorage.serializePath(options.path),
      CookieStorage.serializeDomain(options.domain),
    ]
      .filter(Boolean)
      .join('');
  }

  private static parseCookieEntry(cookie: string): [string, string] {
    const trimmed = cookie.trim();
    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      return [trimmed, ''];
    }

    const key = trimmed.substring(0, separatorIndex).trim();
    const value = trimmed.substring(separatorIndex + 1).trim();

    return [key, value];
  }

  private static findCookieValue(encodedKey: string, cookies: string[]): string | null {
    for (const cookie of cookies) {
      const [key, value] = CookieStorage.parseCookieEntry(cookie);
      if (key === encodedKey) {
        return value;
      }
    }
    return null;
  }

  private static extractCookieKey(cookie: string): string {
    const [key] = CookieStorage.parseCookieEntry(cookie);
    return decodeURIComponent(key);
  }
}
