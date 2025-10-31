import type { CookieOptions } from './types';

export class CookieSerializer {
  private static readonly MILLISECONDS_PER_DAY = 86400000;

  private static toExpiresDate(expires: Date | number): Date {
    return typeof expires === 'number'
      ? new Date(Date.now() + expires * CookieSerializer.MILLISECONDS_PER_DAY)
      : expires;
  }

  private static serializeExpires(expires?: Date | number): string {
    return expires ? `; expires=${CookieSerializer.toExpiresDate(expires).toUTCString()}` : '';
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

  private static shouldEnforceSecure(options: CookieOptions): boolean {
    return options.sameSite === 'None' && !options.secure;
  }

  private static enforceSecureForSameSiteNone(options: CookieOptions): CookieOptions {
    if (CookieSerializer.shouldEnforceSecure(options)) {
      console.warn(
        'Cookies with SameSite=None require Secure flag. Automatically setting secure=true.',
      );
      return { ...options, secure: true };
    }
    return options;
  }

  public static buildCookieString(
    encodedKey: string,
    encodedValue: string,
    options: CookieOptions,
  ): string {
    const normalizedOptions = CookieSerializer.enforceSecureForSameSiteNone(options);

    return [
      `${encodedKey}=${encodedValue}`,
      CookieSerializer.serializeExpires(normalizedOptions.expires),
      CookieSerializer.serializePath(normalizedOptions.path),
      CookieSerializer.serializeDomain(normalizedOptions.domain),
      CookieSerializer.serializeSecure(normalizedOptions.secure),
      CookieSerializer.serializeSameSite(normalizedOptions.sameSite),
    ]
      .filter(Boolean)
      .join('');
  }

  public static buildRemoveCookieString(
    encodedKey: string,
    options: Pick<CookieOptions, 'path' | 'domain'>,
  ): string {
    return [
      `${encodedKey}=`,
      '; max-age=0',
      CookieSerializer.serializePath(options.path),
      CookieSerializer.serializeDomain(options.domain),
    ]
      .filter(Boolean)
      .join('');
  }
}
