const MILLISECONDS_PER_DAY = 86400000;

export class CookieStorage {
  static setItem<T>(key: string, value: T, expiresInDays?: number): void {
    const encoded = `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(value))}`;
    const expires = expiresInDays
      ? `; expires=${new Date(Date.now() + expiresInDays * MILLISECONDS_PER_DAY).toUTCString()}`
      : '';
    document.cookie = `${encoded + expires}; path=/; samesite=Lax`;
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
    document.cookie = `${encodeURIComponent(key)}=; max-age=0; path=/`;
  }
}
