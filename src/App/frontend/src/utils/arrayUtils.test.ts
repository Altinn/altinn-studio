import { areStringsUnique, consistsOfStringsOnly, zipArrays } from 'src/utils/arrayUtils';

describe('arrayUtils', () => {
  describe('consistsOfStringsOnly', () => {
    it('Returns true when all values are strings', () => {
      expect(consistsOfStringsOnly(['a', 'b', 'c'])).toBe(true);
    });

    it('Returns false when at least one value is not a string', () => {
      expect(consistsOfStringsOnly(['a', 1, 'c'])).toBe(false);
    });

    it('Returns true for an empty array', () => {
      expect(consistsOfStringsOnly([])).toBe(true);
    });
  });

  describe('areStringsUnique', () => {
    it('Returns true when all strings are unique', () => {
      expect(areStringsUnique(['a', 'b', 'c'])).toBe(true);
    });

    it('Returns false when duplicate strings exist', () => {
      expect(areStringsUnique(['a', 'b', 'a'])).toBe(false);
    });

    it('Returns true for an empty array', () => {
      expect(areStringsUnique([])).toBe(true);
    });
  });

  describe('zipArrays', () => {
    it('Zips two arrays of equal length', () => {
      expect(zipArrays(['a', 'b', 'c'], [1, 2, 3])).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', 3],
      ]);
    });

    it('Uses the length of the first array', () => {
      expect(zipArrays(['a', 'b', 'c'], [1, 2])).toEqual([
        ['a', 1],
        ['b', 2],
        ['c', undefined],
      ]);
      expect(zipArrays(['a', 'b'], [1, 2, 3])).toEqual([
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('Returns an empty array when the first array is empty', () => {
      expect(zipArrays([], [1, 2, 3])).toEqual([]);
    });

    it('Supports different value types', () => {
      expect(zipArrays([true, 'a', 1], ['b', -2, false])).toEqual([
        [true, 'b'],
        ['a', -2],
        [1, false],
      ]);
    });
  });
});
