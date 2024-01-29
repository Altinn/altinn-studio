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
});
