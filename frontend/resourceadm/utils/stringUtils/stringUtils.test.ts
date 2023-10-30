import { replaceWhiteSpaceWithHyphens } from './stringUtils';

describe('stringUtils', () => {
  describe('replaceWhiteSpaceWithHyphens', () => {
    const mockStringBefore: string = 'Test 123';
    const mockStringAfter: string = 'Test-123';

    it('replaces white space with "-"', () => {
      const result = replaceWhiteSpaceWithHyphens(mockStringBefore);
      expect(result).toEqual(mockStringAfter);
    });
  });
});
