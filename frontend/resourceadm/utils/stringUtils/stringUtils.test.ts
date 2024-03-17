import { formatIdString } from './stringUtils';

describe('stringUtils', () => {
  describe('formatIdString', () => {
    const mockStringBefore: string = 'Test 123?/id--\'"heh?æøÅTest';
    const mockStringAfter: string = 'test-123-id---heh-æøåtest';

    it('replaces illegal characters with "-"', () => {
      const result = formatIdString(mockStringBefore);
      expect(result).toEqual(mockStringAfter);
    });
  });
});
