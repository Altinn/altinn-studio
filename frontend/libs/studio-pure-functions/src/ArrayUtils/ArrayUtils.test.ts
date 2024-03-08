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

  describe('removeItemByValue', () => {
    it('Deletes item from array by value', () => {
      expect(ArrayUtils.removeItemByValue([1, 2, 3], 2)).toEqual([1, 3]);
      expect(ArrayUtils.removeItemByValue(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
      expect(ArrayUtils.removeItemByValue(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c']);
      expect(ArrayUtils.removeItemByValue([], 'a')).toEqual([]);
      expect(ArrayUtils.removeItemByValue(['a', 'b', 'c', 'b', 'a'], 'b')).toEqual(['a', 'c', 'a']);
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

  describe('ArrayUtils.intersection', () => {
    it('Returns intersection of two arrays when included is true', () => {
      expect(ArrayUtils.intersection([1, 2, 3], [3, '4', 5])).toStrictEqual([3]);
      expect(ArrayUtils.intersection([1, 2, 3], [4, '4', 5])).toStrictEqual([]);
      expect(ArrayUtils.intersection([1, 2, 3], [3, '4', 2])).toStrictEqual([2, 3]);
      expect(ArrayUtils.intersection([1, 2, 3], [1, 2, 3])).toStrictEqual([1, 2, 3]);
    });

    it('Returns intersection of two arrays when included is false', () => {
      expect(ArrayUtils.intersection([1, 2, 3], [3, '4', 5], false)).toStrictEqual([1, 2]);
      expect(ArrayUtils.intersection([1, 2, 3], [4, '4', 5], false)).toStrictEqual([1, 2, 3]);
      expect(ArrayUtils.intersection([1, 2, 3], [3, '4', 2], false)).toStrictEqual([1]);
      expect(ArrayUtils.intersection([1, 2, 3], [1, 2, 3], false)).toStrictEqual([]);
    });
  });

  describe('replaceByIndex', () => {
    it('Replaces element in array with new value', () => {
      const array1 = ['0', '1', '2'];
      expect(ArrayUtils.replaceByIndex(array1, 0, '1')).toEqual(['1', '1', '2']);

      const array2 = [0, 1, 2];
      expect(ArrayUtils.replaceByIndex(array2, 1, 2)).toEqual([0, 2, 2]);

      const array3 = [true, false, true];
      expect(ArrayUtils.replaceByIndex(array3, 2, false)).toEqual([true, false, false]);
    });

    it('Returns initial array if index is invalid', () => {
      const array = [0, 1, 2];
      expect(ArrayUtils.replaceByIndex(array, 4, 2)).toEqual(array);
    });
  });

  describe('removeItemByIndex', () => {
    it('Deletes item from array by value', () => {
      expect(ArrayUtils.removeItemByIndex([1, 2, 3], 1)).toEqual([1, 3]);
      expect(ArrayUtils.removeItemByIndex(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
      expect(ArrayUtils.removeItemByIndex(['a', 'b', 'c'], 3)).toEqual(['a', 'b', 'c']);
      expect(ArrayUtils.removeItemByIndex([], 1)).toEqual([]);
    });
  });
});
