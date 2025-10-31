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
  beforeAll(clearAllCookies);
  afterEach(clearAllCookies);

  describe('setItem and getItem', () => {
    test('getItem should return string value when cookie was set with string', () => {
      CookieStorage.setItem('testKey', 'testValue');
      const result = CookieStorage.getItem<string>('testKey');
      expect(result).toBe('testValue');
    });

    test('getItem should return number value when cookie was set with number', () => {
      CookieStorage.setItem('numberKey', 42);
      const result = CookieStorage.getItem<number>('numberKey');
      expect(result).toBe(42);
    });

    test('getItem should return boolean value when cookie was set with boolean', () => {
      CookieStorage.setItem('boolKey', true);
      const result = CookieStorage.getItem<boolean>('boolKey');
      expect(result).toBe(true);
    });

    test('getItem should return object when cookie was set with object', () => {
      const testObject = { name: 'Alice', age: 30, active: true };
      CookieStorage.setItem('objectKey', testObject);
      const result = CookieStorage.getItem<typeof testObject>('objectKey');
      expect(result).toEqual(testObject);
    });

    test('getItem should return array when cookie was set with array', () => {
      const testArray = [1, 2, 3, 4, 5];
      CookieStorage.setItem('arrayKey', testArray);
      const result = CookieStorage.getItem<number[]>('arrayKey');
      expect(result).toEqual(testArray);
    });

    test('getItem should return complex nested object when cookie was set with nested structure', () => {
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

    test('getItem should return null when cookie does not exist', () => {
      const result = CookieStorage.getItem<string>('nonExistentKey');
      expect(result).toBeNull();
    });

    test('setItem and getItem should handle special characters in key names', () => {
      const specialKey = 'key-with-special_chars.123';
      CookieStorage.setItem(specialKey, 'value');
      const result = CookieStorage.getItem<string>(specialKey);
      expect(result).toBe('value');
    });

    test('setItem and getItem should handle special characters in values', () => {
      const specialValue = 'value with spaces & symbols: @#$%';
      CookieStorage.setItem('specialValueKey', specialValue);
      const result = CookieStorage.getItem<string>('specialValueKey');
      expect(result).toBe(specialValue);
    });

    test('setItem should log warning and not store cookie when value is undefined', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      CookieStorage.setItem('undefinedKey', undefined);
      const result = CookieStorage.getItem<string>('undefinedKey');
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot set cookie "undefinedKey"'),
      );
      consoleWarnSpy.mockRestore();
    });

    test('setItem should log warning and not store cookie when value is null', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      CookieStorage.setItem('nullKey', null);
      const result = CookieStorage.getItem<string>('nullKey');
      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot set cookie "nullKey"'),
      );
      consoleWarnSpy.mockRestore();
    });

    test('setItem should overwrite existing cookie when called with same key', () => {
      CookieStorage.setItem('overwriteKey', 'firstValue');
      CookieStorage.setItem('overwriteKey', 'secondValue');
      const result = CookieStorage.getItem<string>('overwriteKey');
      expect(result).toBe('secondValue');
    });
  });

  describe('removeItem', () => {
    test('removeItem should delete cookie when it exists', () => {
      CookieStorage.setItem('removeKey', 'value');
      expect(CookieStorage.getItem<string>('removeKey')).toBe('value');

      CookieStorage.removeItem('removeKey');
      expect(CookieStorage.getItem<string>('removeKey')).toBeNull();
    });

    test('removeItem should not throw error when cookie does not exist', () => {
      expect(() => CookieStorage.removeItem('nonExistentKey')).not.toThrow();
    });

    test('removeItem should delete cookie when path matches original', () => {
      CookieStorage.setItem('pathKey', 'value', { path: '/test' });
      CookieStorage.removeItem('pathKey', { path: '/test' });
      expect(CookieStorage.getItem<string>('pathKey')).toBeNull();
    });
  });

  describe('getAllKeys', () => {
    test('getAllKeys should return empty array when no cookies exist', () => {
      const keys = CookieStorage.getAllKeys();
      expect(keys).toEqual([]);
    });

    test('getAllKeys should return array of all cookie names when multiple cookies exist', () => {
      CookieStorage.setItem('key1', 'value1');
      CookieStorage.setItem('key2', 'value2');
      CookieStorage.setItem('key3', 'value3');

      const keys = CookieStorage.getAllKeys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    test('getAllKeys should decode URL-encoded keys when key contains special characters', () => {
      CookieStorage.setItem('key with spaces', 'value');
      const keys = CookieStorage.getAllKeys();
      expect(keys).toContain('key with spaces');
    });
  });

  describe('integration with CookieSerializer', () => {
    test('setItem should delegate cookie string building to CookieSerializer with all options', () => {
      const setDocumentCookieSpy = jest.spyOn(document, 'cookie', 'set');

      CookieStorage.setItem('optionsKey', 'value', {
        expires: 7,
        path: '/admin',
        secure: true,
        sameSite: 'Strict',
      });

      const capturedCookieString = setDocumentCookieSpy.mock.calls[0][0];
      expect(capturedCookieString).toContain('optionsKey=');
      expect(capturedCookieString).toContain('expires=');
      expect(capturedCookieString).toContain('path=/admin');
      expect(capturedCookieString).toContain('; secure');
      expect(capturedCookieString).toContain('samesite=Strict');

      setDocumentCookieSpy.mockRestore();
    });

    test('removeItem should delegate cookie removal string building to CookieSerializer with path option', () => {
      CookieStorage.setItem('removeOptionsKey', 'value', { path: '/admin' });

      const setDocumentCookieSpy = jest.spyOn(document, 'cookie', 'set');
      CookieStorage.removeItem('removeOptionsKey', { path: '/admin' });

      const capturedCookieString = setDocumentCookieSpy.mock.calls[0][0];
      expect(capturedCookieString).toContain('removeOptionsKey=');
      expect(capturedCookieString).toContain('max-age=0');
      expect(capturedCookieString).toContain('path=/admin');

      setDocumentCookieSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    test('getItem should return null and log warning when cookie value is malformed JSON', () => {
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

    test('setItem should throw TypeError and log error when value contains circular reference', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

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
    test('setItem and getItem should handle empty string value', () => {
      CookieStorage.setItem('emptyKey', '');
      const result = CookieStorage.getItem<string>('emptyKey');
      expect(result).toBe('');
    });

    test('setItem and getItem should handle zero as value', () => {
      CookieStorage.setItem('zeroKey', 0);
      const result = CookieStorage.getItem<number>('zeroKey');
      expect(result).toBe(0);
    });

    test('setItem and getItem should handle false as value', () => {
      CookieStorage.setItem('falseKey', false);
      const result = CookieStorage.getItem<boolean>('falseKey');
      expect(result).toBe(false);
    });

    test('setItem and getItem should handle unicode emoji characters in value', () => {
      const unicodeValue = 'Hello 👋 World 🌍';
      CookieStorage.setItem('unicodeKey', unicodeValue);
      const result = CookieStorage.getItem<string>('unicodeKey');
      expect(result).toBe(unicodeValue);
    });

    test('setItem and getItem should handle Norwegian characters in value', () => {
      const norwegianValue = 'Æ Ø Å æ ø å';
      CookieStorage.setItem('norwegianKey', norwegianValue);
      const result = CookieStorage.getItem<string>('norwegianKey');
      expect(result).toBe(norwegianValue);
    });

    test('setItem and getItem should handle equals signs in string value', () => {
      const valueWithEquals = 'base64=abc123==';
      CookieStorage.setItem('equalsKey', valueWithEquals);
      const result = CookieStorage.getItem<string>('equalsKey');
      expect(result).toBe(valueWithEquals);
    });

    test('setItem and getItem should handle equals signs in object properties', () => {
      const objectWithEquals = { token: 'Bearer=xyz123==', url: 'https://example.com?foo=bar' };
      CookieStorage.setItem('complexEqualsKey', objectWithEquals);
      const result = CookieStorage.getItem<typeof objectWithEquals>('complexEqualsKey');
      expect(result).toEqual(objectWithEquals);
    });
  });
});
