import { areObjectsEqual } from 'app-shared/utils/objectUtils';

describe('objectUtils', () => {
  describe('areObjectsEqual', () => {
    it('Returns true if objects are equal', () => {
      expect(areObjectsEqual({}, {})).toBe(true);
      expect(areObjectsEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(areObjectsEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(areObjectsEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3 })).toBe(true);
    });

    it('Returns false if objects are not equal', () => {
      expect(areObjectsEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(areObjectsEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(areObjectsEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 4 })).toBe(false);
    });
  });
});
