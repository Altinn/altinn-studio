import {
  extractPageIndexPrefix,
  findPageIndexInChildList,
  removePageIndexPrefix,
} from './pageIndexUtils';

describe('pageIndexUtils', () => {
  describe('findPageIndexInChildList', () => {
    it('Finds the page index of a component in a list of child ids', () => {
      const children = ['0:test', '1:otherTest'];
      expect(findPageIndexInChildList('test', children)).toBe(0);
      expect(findPageIndexInChildList('otherTest', children)).toBe(1);
    });
  });

  describe('removePageIndexPrefix', () => {
    it('Removes the page index prefix from a prefixed component id', () => {
      expect(removePageIndexPrefix('0:test')).toBe('test');
      expect(removePageIndexPrefix('1:2:3')).toBe('2:3');
    });

    it('Does not remove anything from an unprefixed component id', () => {
      expect(removePageIndexPrefix('test')).toBe('test');
    });
  });

  describe('extractPageIndexPrefix', () => {
    it('Extracts the page index prefix from a prefixed component id', () => {
      expect(extractPageIndexPrefix('0:test')).toBe(0);
      expect(extractPageIndexPrefix('1:2:3')).toBe(1);
    });
  });
});
