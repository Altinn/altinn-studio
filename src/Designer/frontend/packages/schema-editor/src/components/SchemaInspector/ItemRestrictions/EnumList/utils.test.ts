import { findDuplicateValues } from './utils';

describe('utils', () => {
  describe('findDuplicateValues', () => {
    it('returns "null" when all values are unique', () => {
      const array: string[] = ['a', 'b', 'c'];
      expect(findDuplicateValues(array)).toBeNull();
    });

    it('returns list of duplicateValues when some values are not unique', () => {
      const array: string[] = ['a', 'b', 'a', 'b', 'c'];
      expect(findDuplicateValues(array)).toEqual(['a', 'b']);
    });

    it('does not return any empty strings when list has duplicate empty strings', () => {
      const array: string[] = ['a', 'b', '', 'a', 'b', 'c', ''];
      expect(findDuplicateValues(array)).toEqual(['a', 'b']);
    });
  });
});
