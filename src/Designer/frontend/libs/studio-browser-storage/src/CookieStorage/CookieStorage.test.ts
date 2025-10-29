import { CookieStorage } from './CookieStorage';

function clearAllCookies(): void {
  document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter(Boolean)
    .forEach((key) => {
      document.cookie = `${key}=; max-age=0; path=/`;
    });
}

describe('CookieStorage', () => {
  beforeEach(clearAllCookies);
  afterEach(clearAllCookies);

  describe('setItem and getItem', () => {
    it('should store and retrieve a string value', () => {
      CookieStorage.setItem('testKey', 'testValue');
      const result = CookieStorage.getItem<string>('testKey');
      expect(result).toBe('testValue');
    });

    it('should store and retrieve a number value', () => {
      CookieStorage.setItem('numberKey', 42);
      const result = CookieStorage.getItem<number>('numberKey');
      expect(result).toBe(42);
    });

    it('should store and retrieve a boolean value', () => {
      CookieStorage.setItem('boolKey', true);
      const result = CookieStorage.getItem<boolean>('boolKey');
      expect(result).toBe(true);
    });

    it('should store and retrieve an object', () => {
      const testObject = { name: 'Alice', age: 30, active: true };
      CookieStorage.setItem('objectKey', testObject);
      const result = CookieStorage.getItem<typeof testObject>('objectKey');
      expect(result).toEqual(testObject);
    });

    it('should store and retrieve an array', () => {
      const testArray = [1, 2, 3, 4, 5];
      CookieStorage.setItem('arrayKey', testArray);
      const result = CookieStorage.getItem<number[]>('arrayKey');
      expect(result).toEqual(testArray);
    });

    it('should store and retrieve complex nested objects', () => {
      const complexObject = {
        user: {
          name: 'Bob',
          preferences: {
            theme: 'dark',
            notifications: true,
          },
        },
        tags: ['admin', 'user'],
      };
      CookieStorage.setItem('complexKey', complexObject);
      const result = CookieStorage.getItem<typeof complexObject>('complexKey');
      expect(result).toEqual(complexObject);
    });

    it('should return null for non-existent key', () => {
      const result = CookieStorage.getItem<string>('nonExistentKey');
      expect(result).toBeNull();
    });

    it('should handle special characters in key names', () => {
      const specialKey = 'key-with-special_chars.123';
      CookieStorage.setItem(specialKey, 'value');
      const result = CookieStorage.getItem<string>(specialKey);
      expect(result).toBe('value');
    });

    it('should handle special characters in values', () => {
      const specialValue = 'value with spaces & symbols: @#$%';
      CookieStorage.setItem('specialValueKey', specialValue);
      const result = CookieStorage.getItem<string>('specialValueKey');
      expect(result).toBe(specialValue);
    });

    it('should not store undefined values', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      CookieStorage.setItem('undefinedKey', undefined);
      const result = CookieStorage.getItem<string>('undefinedKey');
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot set cookie "undefinedKey"'),
      );
      consoleWarnSpy.mockRestore();
    });

    it('should not store null values', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      CookieStorage.setItem('nullKey', null);
      const result = CookieStorage.getItem<string>('nullKey');
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot set cookie "nullKey"'),
      );
      consoleWarnSpy.mockRestore();
    });

    it('should overwrite existing cookie with same key', () => {
      CookieStorage.setItem('overwriteKey', 'firstValue');
      CookieStorage.setItem('overwriteKey', 'secondValue');
      const result = CookieStorage.getItem<string>('overwriteKey');
      expect(result).toBe('secondValue');
    });
  });

  describe('removeItem', () => {
    it('should remove an existing cookie', () => {
      CookieStorage.setItem('removeKey', 'value');
      expect(CookieStorage.getItem<string>('removeKey')).toBe('value');

      CookieStorage.removeItem('removeKey');
      expect(CookieStorage.getItem<string>('removeKey')).toBeNull();
    });

    it('should not throw error when removing non-existent cookie', () => {
      expect(() => CookieStorage.removeItem('nonExistentKey')).not.toThrow();
    });

    it('should remove cookie with matching path', () => {
      CookieStorage.setItem('pathKey', 'value', { path: '/test' });
      CookieStorage.removeItem('pathKey', { path: '/test' });
      expect(CookieStorage.getItem<string>('pathKey')).toBeNull();
    });
  });

  describe('getAllKeys', () => {
    it('should return empty array when no cookies exist', () => {
      const keys = CookieStorage.getAllKeys();
      expect(keys).toEqual([]);
    });

    it('should return all cookie keys', () => {
      CookieStorage.setItem('key1', 'value1');
      CookieStorage.setItem('key2', 'value2');
      CookieStorage.setItem('key3', 'value3');

      const keys = CookieStorage.getAllKeys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should decode URL-encoded keys', () => {
      CookieStorage.setItem('key with spaces', 'value');
      const keys = CookieStorage.getAllKeys();
      expect(keys).toContain('key with spaces');
    });
  });

  describe('cookie options', () => {
    it('should set cookie with expiration date', () => {
      const futureDate = new Date(Date.now() + 86400000); // 1 day from now
      CookieStorage.setItem('expiresKey', 'value', { expires: futureDate });

      const result = CookieStorage.getItem<string>('expiresKey');
      expect(result).toBe('value');
    });

    it('should set cookie with expiration in days', () => {
      CookieStorage.setItem('expiresInDaysKey', 'value', { expires: 7 }); // 7 days
      const result = CookieStorage.getItem<string>('expiresInDaysKey');
      expect(result).toBe('value');
    });

    it('should set cookie with custom path', () => {
      const setDocumentCookieSpy = jest.spyOn(document, 'cookie', 'set');

      CookieStorage.setItem('pathKey', 'value', { path: '/custom' });

      expect(setDocumentCookieSpy).toHaveBeenCalledWith(expect.stringContaining('path=/custom'));

      setDocumentCookieSpy.mockRestore();
    });

    it('should set cookie with secure flag', () => {
      const setDocumentCookieSpy = jest.spyOn(document, 'cookie', 'set');

      CookieStorage.setItem('secureKey', 'value', { secure: true });

      expect(setDocumentCookieSpy).toHaveBeenCalledWith(expect.stringContaining('; secure'));

      setDocumentCookieSpy.mockRestore();
    });

    it('should set cookie with SameSite=Strict', () => {
      const setDocumentCookieSpy = jest.spyOn(document, 'cookie', 'set');

      CookieStorage.setItem('strictKey', 'value', { sameSite: 'Strict' });

      expect(setDocumentCookieSpy).toHaveBeenCalledWith(expect.stringContaining('samesite=Strict'));
      expect(CookieStorage.getItem<string>('strictKey')).toBe('value');

      setDocumentCookieSpy.mockRestore();
    });

    it('should set cookie with SameSite=Lax', () => {
      const setDocumentCookieSpy = jest.spyOn(document, 'cookie', 'set');

      CookieStorage.setItem('laxKey', 'value', { sameSite: 'Lax' });

      expect(setDocumentCookieSpy).toHaveBeenCalledWith(expect.stringContaining('samesite=Lax'));
      expect(CookieStorage.getItem<string>('laxKey')).toBe('value');

      setDocumentCookieSpy.mockRestore();
    });

    it('should set cookie with SameSite=None', () => {
      const setDocumentCookieSpy = jest.spyOn(document, 'cookie', 'set');

      CookieStorage.setItem('noneKey', 'value', { sameSite: 'None' });

      expect(setDocumentCookieSpy).toHaveBeenCalledWith(expect.stringContaining('samesite=None'));
      expect(CookieStorage.getItem<string>('noneKey')).toBe('value');

      setDocumentCookieSpy.mockRestore();
    });

    it('should set cookie with multiple options', () => {
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(
        Document.prototype,
        'cookie',
      );
      let capturedCookieString = '';

      Object.defineProperty(document, 'cookie', {
        set: (value: string) => {
          capturedCookieString = value;
          originalCookieDescriptor?.set?.call(document, value);
        },
        get: originalCookieDescriptor?.get,
        configurable: true,
      });

      CookieStorage.setItem('multiOptionKey', 'value', {
        expires: 7,
        path: '/',
        sameSite: 'Strict',
      });

      expect(capturedCookieString).toContain('expires=');
      expect(capturedCookieString).toContain('path=/');
      expect(capturedCookieString).toContain('samesite=Strict');
      expect(CookieStorage.getItem<string>('multiOptionKey')).toBe('value');

      // Restore original descriptor
      if (originalCookieDescriptor) {
        Object.defineProperty(document, 'cookie', originalCookieDescriptor);
      }
    });
  });

  describe('error handling', () => {
    it('should handle malformed cookie values gracefully', () => {
      // Manually set a malformed cookie
      document.cookie = 'malformedKey=not-valid-json; path=/';

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = CookieStorage.getItem<string>('malformedKey');

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse cookie'),
        expect.any(Error),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle serialization errors and throw', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Create a circular reference that will fail JSON.stringify
      const circular: any = { a: 1 };
      circular.self = circular;

      expect(() => CookieStorage.setItem('circularKey', circular)).toThrow(TypeError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to set cookie'),
        expect.any(TypeError),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      CookieStorage.setItem('emptyKey', '');
      const result = CookieStorage.getItem<string>('emptyKey');
      expect(result).toBe('');
    });

    it('should handle zero as a value', () => {
      CookieStorage.setItem('zeroKey', 0);
      const result = CookieStorage.getItem<number>('zeroKey');
      expect(result).toBe(0);
    });

    it('should handle false as a value', () => {
      CookieStorage.setItem('falseKey', false);
      const result = CookieStorage.getItem<boolean>('falseKey');
      expect(result).toBe(false);
    });

    it('should handle unicode characters', () => {
      const unicodeValue = 'Hello 👋 World 🌍';
      CookieStorage.setItem('unicodeKey', unicodeValue);
      const result = CookieStorage.getItem<string>('unicodeKey');
      expect(result).toBe(unicodeValue);
    });

    it('should handle Norwegian characters', () => {
      const norwegianValue = 'Æ Ø Å æ ø å';
      CookieStorage.setItem('norwegianKey', norwegianValue);
      const result = CookieStorage.getItem<string>('norwegianKey');
      expect(result).toBe(norwegianValue);
    });

    it('should handle values containing equals signs', () => {
      const valueWithEquals = 'base64=abc123==';
      CookieStorage.setItem('equalsKey', valueWithEquals);
      const result = CookieStorage.getItem<string>('equalsKey');
      expect(result).toBe(valueWithEquals);
    });

    it('should handle objects with equals signs in values', () => {
      const objectWithEquals = { token: 'Bearer=xyz123==', url: 'https://example.com?foo=bar' };
      CookieStorage.setItem('complexEqualsKey', objectWithEquals);
      const result = CookieStorage.getItem<typeof objectWithEquals>('complexEqualsKey');
      expect(result).toEqual(objectWithEquals);
    });
  });
});
