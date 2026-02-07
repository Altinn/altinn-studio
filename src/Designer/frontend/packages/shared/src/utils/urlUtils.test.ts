import { buildQueryParams, getValidExternalUrl } from 'app-shared/utils/urlUtils';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

describe('urlUtils', () => {
  describe('buildQueryParams', () => {
    it('Builds query parameters from given object', () => {
      const param1 = 'param1';
      const param2 = 'param2';
      const value1 = 'value1';
      const value2 = 2;
      const params: KeyValuePairs<string | number> = {
        [param1]: value1,
        [param2]: value2,
      };
      expect(buildQueryParams(params)).toBe(`?${param1}=${value1}&${param2}=${value2}`);
    });

    it('Returns empty string if no parameters are given', () => {
      expect(buildQueryParams({})).toBe('');
    });
  });

  describe('getValidExternalUrl', () => {
    it('returns undefined for empty string', () => {
      expect(getValidExternalUrl('')).toBeUndefined();
    });

    it('returns undefined for clearly invalid URL text', () => {
      expect(getValidExternalUrl('not a url')).toBeUndefined();
    });

    it('returns undefined for hostname without dot', () => {
      expect(getValidExternalUrl('dfdfdfd')).toBeUndefined();
    });

    it('adds https protocol if missing and returns valid URL', () => {
      expect(getValidExternalUrl('example.com')).toBe('https://example.com');
    });

    it('returns valid URL with existing http protocol', () => {
      expect(getValidExternalUrl('http://example.com')).toBe('http://example.com');
    });

    it('returns valid URL with existing https protocol', () => {
      expect(getValidExternalUrl('https://example.com')).toBe('https://example.com');
    });
  });
});
