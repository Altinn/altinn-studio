import {
  removeEnd,
  removeStart,
  replaceEnd,
  replaceStart,
  substringAfterLast,
  substringBeforeLast,
} from 'app-shared/utils/stringUtils';

describe('stringUtils', () => {
  describe('substringAfterLast', () => {
    it('Returns substring after last occurrence of separator', () => {
      expect(substringAfterLast('abc/def/ghi', '/')).toBe('ghi');
    });

    it('Returns whole string if separator is not found', () => {
      expect(substringAfterLast('abc', '/')).toBe('abc');
    });

    it('Returns empty string if there are no characters after the last separator', () => {
      expect(substringAfterLast('abc/def/', '/')).toBe('');
    });
  });

  describe('substringBeforeLast', () => {
    it('Returns substring before last occurrence of separator', () => {
      expect(substringBeforeLast('abc/def/ghi', '/')).toBe('abc/def');
    });

    it('Returns whole string if separator is not found', () => {
      expect(substringBeforeLast('abc', '/')).toBe('abc');
    });

    it('Returns whole string if there are no characters before the last separator', () => {
      expect(substringBeforeLast('/abc', '/')).toBe('');
    });
  });

  describe('replaceStart', () => {
    it('Replaces the given substring with the given replacement at the start of the string', () => {
      expect(replaceStart('abc/def/ghi', 'abc', 'xyz')).toBe('xyz/def/ghi');
    });

    it('Does not replace the given substring other places than at the start', () => {
      expect(replaceStart('abcdefghi', 'ghi', 'xyz')).toBe('abcdefghi');
      expect(replaceStart('abcdefghi', 'def', 'xyz')).toBe('abcdefghi');
      expect(replaceStart('defabcdefghi', 'def', 'xyz')).toBe('xyzabcdefghi');
    });
  });

  describe('replaceEnd', () => {
    it('Replaces the given substring with the given replacement at the end of the string', () => {
      expect(replaceEnd('abc/def/ghi', 'ghi', 'xyz')).toBe('abc/def/xyz');
    });

    it('Does not replace the given substring other places than at the end', () => {
      expect(replaceEnd('abcdefghi', 'abc', 'xyz')).toBe('abcdefghi');
      expect(replaceEnd('abcdefghi', 'def', 'xyz')).toBe('abcdefghi');
      expect(replaceEnd('abcdefghidef', 'def', 'xyz')).toBe('abcdefghixyz');
    });
  });

  describe('removeStart', () => {
    it('Removes any of the given substrings from the start of the string', () => {
      expect(removeStart('abc/def/ghi', 'abc')).toBe('/def/ghi');
      expect(removeStart('abc/def/ghi', 'abc', 'def')).toBe('/def/ghi');
      expect(removeStart('abc/def/ghi', 'def', 'abc')).toBe('/def/ghi');
    });

    it('Does not change the string if none of the substrings appear at the start', () => {
      expect(removeStart('abc/def/ghi', 'ghi')).toBe('abc/def/ghi');
      expect(removeStart('abc/def/ghi', 'def')).toBe('abc/def/ghi');
      expect(removeStart('abc/def/ghi', 'def', 'ghi')).toBe('abc/def/ghi');
    });

    it('Is not case sensitive', () => {
      expect(removeStart('abc/def/ghi', 'ABC')).toBe('/def/ghi');
      expect(removeStart('ABC/DEF/GHI', 'abc')).toBe('/DEF/GHI');
      expect(removeStart('aBc/DeF/gHi', 'AbC')).toBe('/DeF/gHi');
    });
  });

  describe('removeEnd', () => {
    it('Removes any of the given substrings from the end of the string', () => {
      expect(removeEnd('abc/def/ghi', 'ghi')).toBe('abc/def/');
      expect(removeEnd('abc/def/ghi', 'ghi', 'def')).toBe('abc/def/');
      expect(removeEnd('abc/def/ghi', 'def', 'ghi')).toBe('abc/def/');
    });

    it('Does not change the string if none of the substrings appear at the end', () => {
      expect(removeEnd('abc/def/ghi', 'abc')).toBe('abc/def/ghi');
      expect(removeEnd('abc/def/ghi', 'def')).toBe('abc/def/ghi');
      expect(removeEnd('abc/def/ghi', 'abc', 'def')).toBe('abc/def/ghi');
    });

    it('Is not case sensitive', () => {
      expect(removeEnd('abc/def/ghi', 'GHI')).toBe('abc/def/');
      expect(removeEnd('ABC/DEF/GHI', 'ghi')).toBe('ABC/DEF/');
      expect(removeEnd('aBc/DeF/gHi', 'Ghi')).toBe('aBc/DeF/');
    });
  });
});
