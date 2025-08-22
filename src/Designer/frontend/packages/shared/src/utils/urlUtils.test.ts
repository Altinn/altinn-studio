import { buildQueryParams } from 'app-shared/utils/urlUtils';
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
});
