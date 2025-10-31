import { CookieSerializer } from './CookieSerializer';

describe('CookieSerializer', () => {
  describe('buildCookieString', () => {
    test('buildCookieString should return cookie string with default path and sameSite when no options provided', () => {
      const result = CookieSerializer.buildCookieString('testKey', 'testValue', {});

      expect(result).toBe('testKey=testValue; path=/; samesite=Lax');
    });

    test('should return cookie string with expires date calculated from days when expires is number', () => {
      const result = CookieSerializer.buildCookieString('key', 'value', { expires: 7 });

      expect(result).toContain('key=value');
      expect(result).toContain('expires=');
      expect(result).toContain('path=/');
      expect(result).toContain('samesite=Lax');
    });

    test('should return cookie string with specified expiration date when expires is Date object', () => {
      const expiryDate = new Date('2030-12-31T23:59:59Z');
      const result = CookieSerializer.buildCookieString('key', 'value', { expires: expiryDate });

      expect(result).toContain('key=value');
      expect(result).toContain('expires=Tue, 31 Dec 2030 23:59:59 GMT');
      expect(result).toContain('path=/');
    });

    test('should return cookie string with specified path when path option provided', () => {
      const result = CookieSerializer.buildCookieString('key', 'value', { path: '/admin' });

      expect(result).toContain('path=/admin');
    });

    test('should return cookie string with specified domain when domain option provided', () => {
      const result = CookieSerializer.buildCookieString('key', 'value', {
        domain: '.altinn.no',
      });

      expect(result).toContain('domain=.altinn.no');
    });

    test('should return cookie string with secure attribute when secure flag is true', () => {
      const result = CookieSerializer.buildCookieString('key', 'value', { secure: true });

      expect(result).toContain('; secure');
    });

    test('should return cookie string with samesite=Strict when sameSite is Strict', () => {
      const result = CookieSerializer.buildCookieString('key', 'value', { sameSite: 'Strict' });

      expect(result).toContain('samesite=Strict');
    });

    test('should return cookie string with samesite=Lax when sameSite is Lax', () => {
      const result = CookieSerializer.buildCookieString('key', 'value', { sameSite: 'Lax' });

      expect(result).toContain('samesite=Lax');
    });

    test('should return cookie string with samesite=None when sameSite is None', () => {
      const result = CookieSerializer.buildCookieString('key', 'value', { sameSite: 'None' });

      expect(result).toContain('samesite=None');
    });

    test('should return cookie string with all attributes combined when all options provided', () => {
      const result = CookieSerializer.buildCookieString('key', 'value', {
        expires: 7,
        path: '/admin',
        domain: '.altinn.no',
        secure: true,
        sameSite: 'Strict',
      });

      expect(result).toContain('key=value');
      expect(result).toContain('expires=');
      expect(result).toContain('path=/admin');
      expect(result).toContain('domain=.altinn.no');
      expect(result).toContain('; secure');
      expect(result).toContain('samesite=Strict');
    });
  });

  describe('buildRemoveCookieString', () => {
    test('should return cookie removal string with max-age=0 and default path when no options provided', () => {
      const result = CookieSerializer.buildRemoveCookieString('testKey', {});

      expect(result).toBe('testKey=; max-age=0; path=/');
    });

    test('should return cookie removal string with specified path when path option provided', () => {
      const result = CookieSerializer.buildRemoveCookieString('key', { path: '/admin' });

      expect(result).toContain('key=');
      expect(result).toContain('max-age=0');
      expect(result).toContain('path=/admin');
    });

    test('should return cookie removal string with specified domain when domain option provided', () => {
      const result = CookieSerializer.buildRemoveCookieString('key', { domain: '.altinn.no' });

      expect(result).toContain('key=');
      expect(result).toContain('max-age=0');
      expect(result).toContain('domain=.altinn.no');
    });

    test('should return cookie removal string with both attributes when path and domain provided', () => {
      const result = CookieSerializer.buildRemoveCookieString('key', {
        path: '/admin',
        domain: '.altinn.no',
      });

      expect(result).toContain('key=');
      expect(result).toContain('max-age=0');
      expect(result).toContain('path=/admin');
      expect(result).toContain('domain=.altinn.no');
    });
  });
});
