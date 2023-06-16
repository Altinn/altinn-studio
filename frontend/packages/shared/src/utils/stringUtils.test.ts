import { substringAfterLast, substringBeforeLast } from 'app-shared/utils/stringUtils';

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
});
