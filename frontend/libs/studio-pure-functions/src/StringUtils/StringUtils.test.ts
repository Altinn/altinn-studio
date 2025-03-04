import { StringUtils } from './StringUtils';

describe('StringUtils', () => {
  describe('removeStart', () => {
    it('Removes any of the given substrings from the start of the string', () => {
      expect(StringUtils.removeStart('abc/def/ghi', 'abc')).toBe('/def/ghi');
      expect(StringUtils.removeStart('abc/def/ghi', 'abc', 'def')).toBe('/def/ghi');
      expect(StringUtils.removeStart('abc/def/ghi', 'def', 'abc')).toBe('/def/ghi');
    });

    it('Does not change the string if none of the substrings appear at the start', () => {
      expect(StringUtils.removeStart('abc/def/ghi', 'ghi')).toBe('abc/def/ghi');
      expect(StringUtils.removeStart('abc/def/ghi', 'def')).toBe('abc/def/ghi');
      expect(StringUtils.removeStart('abc/def/ghi', 'def', 'ghi')).toBe('abc/def/ghi');
    });

    it('Is not case sensitive', () => {
      expect(StringUtils.removeStart('abc/def/ghi', 'ABC')).toBe('/def/ghi');
      expect(StringUtils.removeStart('ABC/DEF/GHI', 'abc')).toBe('/DEF/GHI');
      expect(StringUtils.removeStart('aBc/DeF/gHi', 'AbC')).toBe('/DeF/gHi');
    });

    it('Does not change the input string object', () => {
      const input = 'abc/def/ghi';
      StringUtils.removeStart(input, 'abc');
      expect(input).toBe('abc/def/ghi');
    });
  });

  describe('removeEnd', () => {
    it('Removes any of the given substrings from the end of the string', () => {
      expect(StringUtils.removeEnd('abc/def/ghi', 'ghi')).toBe('abc/def/');
      expect(StringUtils.removeEnd('abc/def/ghi', 'ghi', 'def')).toBe('abc/def/');
      expect(StringUtils.removeEnd('abc/def/ghi', 'def', 'ghi')).toBe('abc/def/');
    });

    it('Does not change the string if none of the substrings appear at the end', () => {
      expect(StringUtils.removeEnd('abc/def/ghi', 'abc')).toBe('abc/def/ghi');
      expect(StringUtils.removeEnd('abc/def/ghi', 'def')).toBe('abc/def/ghi');
      expect(StringUtils.removeEnd('abc/def/ghi', 'abc', 'def')).toBe('abc/def/ghi');
    });

    it('Is not case sensitive', () => {
      expect(StringUtils.removeEnd('abc/def/ghi', 'GHI')).toBe('abc/def/');
      expect(StringUtils.removeEnd('ABC/DEF/GHI', 'ghi')).toBe('ABC/DEF/');
      expect(StringUtils.removeEnd('aBc/DeF/gHi', 'Ghi')).toBe('aBc/DeF/');
    });

    it('Does not change the input string object', () => {
      const input = 'abc/def/ghi';
      StringUtils.removeEnd(input, 'ghi');
      expect(input).toBe('abc/def/ghi');
    });
  });

  describe('replaceEnd', () => {
    it('Replaces the given substring with the given replacement at the end of the string', () => {
      expect(StringUtils.replaceEnd('abc/def/ghi', 'ghi', 'xyz')).toBe('abc/def/xyz');
    });

    it('Does not replace the given substring other places than at the end', () => {
      expect(StringUtils.replaceEnd('abcdefghi', 'abc', 'xyz')).toBe('abcdefghi');
      expect(StringUtils.replaceEnd('abcdefghi', 'def', 'xyz')).toBe('abcdefghi');
      expect(StringUtils.replaceEnd('abcdefghidef', 'def', 'xyz')).toBe('abcdefghixyz');
    });
  });

  describe('replaceStart', () => {
    it('Replaces the given substring with the given replacement at the start of the string', () => {
      expect(StringUtils.replaceStart('abc/def/ghi', 'abc', 'xyz')).toBe('xyz/def/ghi');
    });

    it('Does not replace the given substring other places than at the start', () => {
      expect(StringUtils.replaceStart('abcdefghi', 'ghi', 'xyz')).toBe('abcdefghi');
      expect(StringUtils.replaceStart('abcdefghi', 'def', 'xyz')).toBe('abcdefghi');
      expect(StringUtils.replaceStart('defabcdefghi', 'def', 'xyz')).toBe('xyzabcdefghi');
    });
  });

  describe('substringBeforeLast', () => {
    it('Returns substring before last occurrence of separator', () => {
      expect(StringUtils.substringBeforeLast('abc/def/ghi', '/')).toBe('abc/def');
    });

    it('Returns whole string if separator is not found', () => {
      expect(StringUtils.substringBeforeLast('abc', '/')).toBe('abc');
    });

    it('Returns whole string if there are no characters before the last separator', () => {
      expect(StringUtils.substringBeforeLast('/abc', '/')).toBe('');
    });
  });

  describe('substringAfterLast', () => {
    it('Returns substring after last occurrence of separator', () => {
      expect(StringUtils.substringAfterLast('abc/def/ghi', '/')).toBe('ghi');
    });

    it('Returns whole string if separator is not found', () => {
      expect(StringUtils.substringAfterLast('abc', '/')).toBe('abc');
    });

    it('Returns empty string if there are no characters after the last separator', () => {
      expect(StringUtils.substringAfterLast('abc/def/', '/')).toBe('');
    });
  });

  describe('capitalize', () => {
    it('Capitalizes the first letter of the string', () => {
      expect(StringUtils.capitalize('abc')).toBe('Abc');
      expect(StringUtils.capitalize('a')).toBe('A');
    });

    it('Works with empty strings', () => {
      expect(StringUtils.capitalize('')).toBe('');
    });
  });

  describe('areCaseInsensitiveEqual', () => {
    it('Returns true for strings that are equal regardless of case', () => {
      expect(StringUtils.areCaseInsensitiveEqual('test', 'TEST')).toBe(true);
      expect(StringUtils.areCaseInsensitiveEqual('Test', 'TEST')).toBe(true);
      expect(StringUtils.areCaseInsensitiveEqual('TeSt', 'test')).toBe(true);
      expect(StringUtils.areCaseInsensitiveEqual('Test123', 'TEST123')).toBe(true);
      expect(StringUtils.areCaseInsensitiveEqual('123test', '123TEST')).toBe(true);
    });

    it('Returns false for strings that are not equal regardless of case', () => {
      expect(StringUtils.areCaseInsensitiveEqual('test', 'example')).toBe(false);
      expect(StringUtils.areCaseInsensitiveEqual('test', 'TEST123')).toBe(false);
      expect(StringUtils.areCaseInsensitiveEqual('abc', 'ABC123')).toBe(false);
    });

    it('Handles empty strings', () => {
      expect(StringUtils.areCaseInsensitiveEqual('', '')).toBe(true);
      expect(StringUtils.areCaseInsensitiveEqual('abc', '')).toBe(false);
      expect(StringUtils.areCaseInsensitiveEqual('', 'abc')).toBe(false);
    });
  });

  describe('removeLeadingSlash', () => {
    it('Removes leading slash from string', () => {
      expect(StringUtils.removeLeadingSlash('/abc')).toBe('abc');
    });

    it('Does not remove anything if there is no leading slash', () => {
      expect(StringUtils.removeLeadingSlash('abc')).toBe('abc');
    });

    it('Does not remove anything when there are slashes in other places than the start', () => {
      expect(StringUtils.removeLeadingSlash('a/b/c/')).toBe('a/b/c/');
    });

    it('Removes the first slash only when there are multiple', () => {
      expect(StringUtils.removeLeadingSlash('//a/b/c/')).toBe('/a/b/c/');
    });

    it('Does not change the input string object', () => {
      const input = '/abc';
      StringUtils.removeLeadingSlash(input);
      expect(input).toBe('/abc');
    });
  });
});
