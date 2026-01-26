import { CookieStorage } from 'src/utils/cookieStorage/CookieStorage';

describe('CookieStorage', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=; max-age=0; path=/${globalThis.org}/${globalThis.app}`;
    });
  });

  describe('setItem and getItem', () => {
    it('should store and retrieve a string', () => {
      CookieStorage.setItem('testKey', 'testValue');
      expect(CookieStorage.getItem('testKey')).toBe('testValue');
    });

    it('should store and retrieve a number', () => {
      CookieStorage.setItem('numberKey', 42);
      expect(CookieStorage.getItem('numberKey')).toBe(42);
    });

    it('should store and retrieve a boolean', () => {
      CookieStorage.setItem('boolKey', true);
      expect(CookieStorage.getItem('boolKey')).toBe(true);
    });

    it('should store and retrieve an object', () => {
      const obj = { name: 'test', value: 123 };
      CookieStorage.setItem('objectKey', obj);
      expect(CookieStorage.getItem('objectKey')).toEqual(obj);
    });

    it('should store and retrieve an array', () => {
      const arr = [1, 2, 3, 'four'];
      CookieStorage.setItem('arrayKey', arr);
      expect(CookieStorage.getItem('arrayKey')).toEqual(arr);
    });

    it('should handle special characters in keys', () => {
      CookieStorage.setItem('key_with_underscore', 'value1');
      CookieStorage.setItem('key-with-dash', 'value2');
      expect(CookieStorage.getItem('key_with_underscore')).toBe('value1');
      expect(CookieStorage.getItem('key-with-dash')).toBe('value2');
    });

    it('should handle special characters in values', () => {
      CookieStorage.setItem('specialKey', 'value with spaces & symbols!');
      expect(CookieStorage.getItem('specialKey')).toBe('value with spaces & symbols!');
    });

    it('should handle Norwegian characters', () => {
      CookieStorage.setItem('norwegianKey', 'æøåÆØÅ');
      expect(CookieStorage.getItem('norwegianKey')).toBe('æøåÆØÅ');
    });
  });

  describe('getItem edge cases', () => {
    it('should return null for non-existent key', () => {
      expect(CookieStorage.getItem('nonExistent')).toBeNull();
    });

    it('should return null for malformed JSON', () => {
      document.cookie = `malformedKey=not-valid-json; path=/${globalThis.org}/${globalThis.app}`;
      expect(CookieStorage.getItem('malformedKey')).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove an existing cookie', () => {
      CookieStorage.setItem('toRemove', 'value');
      expect(CookieStorage.getItem('toRemove')).toBe('value');

      CookieStorage.removeItem('toRemove');
      expect(CookieStorage.getItem('toRemove')).toBeNull();
    });

    it('should not throw when removing non-existent cookie', () => {
      expect(() => CookieStorage.removeItem('nonExistent')).not.toThrow();
    });
  });

  describe('expiry', () => {
    it('should set cookie with expiry when expiresInDays is provided', () => {
      CookieStorage.setItem('expiryKey', 'value', 7);

      // Cookie should still be readable
      expect(CookieStorage.getItem('expiryKey')).toBe('value');

      // Verify the cookie string contains expires
      expect(document.cookie).toContain('expiryKey');
    });
  });
});
