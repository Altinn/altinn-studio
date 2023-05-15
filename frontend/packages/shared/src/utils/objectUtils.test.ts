import { objectsEqual } from 'app-shared/utils/objectUtils';

describe('objectUtils', () => {
  describe('objectsEqual', () => {
    it('Returns true if objects are equal', () => {
      expect(objectsEqual({}, {})).toBe(true);
      expect(objectsEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(objectsEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(objectsEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 3 })).toBe(true);
    });

    it('Returns false if objects are not equal', () => {
      expect(objectsEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(objectsEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(objectsEqual({ a: 1, b: 2, c: 3 }, { a: 1, b: 2, c: 4 })).toBe(false);
    });
  });
});
