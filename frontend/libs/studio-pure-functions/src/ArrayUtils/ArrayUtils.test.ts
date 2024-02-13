import { ArrayUtils } from './ArrayUtils';

describe('ArrayUtils', () => {
  describe('removeDuplicates', () => {
    it('Removes duplicates', () => {
      expect(ArrayUtils.removeDuplicates([1, 1, 2, 3, 3])).toEqual([1, 2, 3]);
      expect(ArrayUtils.removeDuplicates(['a', 'b', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('Returns equal array if there are no duplicates', () => {
      expect(ArrayUtils.removeDuplicates([1, 2, 3])).toEqual([1, 2, 3]);
      expect(ArrayUtils.removeDuplicates(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(ArrayUtils.removeDuplicates([1, 2, 3, '3'])).toEqual([1, 2, 3, '3']);
    });

    it('Returns empty array if input is empty', () => {
      expect(ArrayUtils.removeDuplicates([])).toEqual([]);
    });
  });

  describe('getValidIndex', () => {
    it('Returns the given index if it is valid', () => {
      expect(ArrayUtils.getValidIndex([1, 2, 3], 0)).toEqual(0);
      expect(ArrayUtils.getValidIndex([1, 2, 3], 1)).toEqual(1);
      expect(ArrayUtils.getValidIndex([1, 2, 3], 2)).toEqual(2);
    });

    it('Returns the last index when the given index is too large', () => {
      expect(ArrayUtils.getValidIndex([1, 2, 3], 3)).toEqual(2);
      expect(ArrayUtils.getValidIndex([1, 2, 3], 4)).toEqual(2);
    });

    it('Returns the last index when the given index is negative', () => {
      expect(ArrayUtils.getValidIndex([1, 2, 3], -1)).toEqual(2);
      expect(ArrayUtils.getValidIndex([1, 2, 3], -2)).toEqual(2);
    });
  });

  describe('last', () => {
    it('Returns last item in array', () => {
      expect(ArrayUtils.last([1, 2, 3])).toEqual(3);
      expect(ArrayUtils.last(['a', 'b', 'c'])).toEqual('c');
    });

    it('Returns undefined if array is empty', () => {
      expect(ArrayUtils.last([])).toBeUndefined();
    });
  });
});
