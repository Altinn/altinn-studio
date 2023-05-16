import { removeItemByValue, last, prepend, removeDuplicates, areItemsUnique } from './arrayUtils';

describe('arrayUtils', () => {

  describe('removeDuplicates', () => {

    it('Removes duplicates', () => {
      expect(removeDuplicates([1, 1, 2, 3, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates(['a', 'b', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('Returns equal array if there are no duplicates', () => {
      expect(removeDuplicates([1, 2, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('Returns empty array if input is empty', () => {
      expect(removeDuplicates([])).toEqual([]);
    });
  });

  describe('prepend', () => {
    it('Prepends item to array', () => {
      expect(prepend([1, 2, 3], 0)).toEqual([0, 1, 2, 3]);
      expect(prepend(['a', 'b', 'c'], 'd')).toEqual(['d', 'a', 'b', 'c']);
    });
  });

  describe('last', () => {
    it('Returns last item in array', () => {
      expect(last([1, 2, 3])).toEqual(3);
      expect(last(['a', 'b', 'c'])).toEqual('c');
    });

    it('Returns undefined if array is empty', () => {
      expect(last([])).toBeUndefined();
    });
  });

  describe('removeItemByValue', () => {
    it('Deletes item from array by value', () => {
      expect(removeItemByValue([1, 2, 3], 2)).toEqual([1, 3]);
      expect(removeItemByValue(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
      expect(removeItemByValue(['a', 'b', 'c'], 'd')).toEqual(['a', 'b', 'c']);
      expect(removeItemByValue([], 'a')).toEqual([]);
      expect(removeItemByValue(['a', 'b', 'c', 'b', 'a'], 'b')).toEqual(['a', 'c', 'a']);
    });
  });

  describe('areItemsUnique', () => {
    it('Returns true if all items are unique', () => {
      expect(areItemsUnique([1, 2, 3])).toBe(true);
      expect(areItemsUnique(['a', 'b', 'c'])).toBe(true);
      expect(areItemsUnique(['abc', 'bcd', 'cde'])).toBe(true);
      expect(areItemsUnique([true, false])).toBe(true);
      expect(areItemsUnique([1, 'b', true])).toBe(true);
      expect(areItemsUnique([0, '', false, null, undefined])).toBe(true);
    });

    it('Returns true if array is empty', () => {
      expect(areItemsUnique([])).toBe(true);
    });

    it('Returns false if there is at least one duplicated item', () => {
      expect(areItemsUnique([1, 2, 1])).toBe(false);
      expect(areItemsUnique(['a', 'a', 'c'])).toBe(false);
      expect(areItemsUnique(['abc', 'bcd', 'bcd'])).toBe(false);
      expect(areItemsUnique([true, false, true])).toBe(false);
      expect(areItemsUnique([1, 'b', false, 1])).toBe(false);
      expect(areItemsUnique([null, null])).toBe(false);
      expect(areItemsUnique([undefined, undefined])).toBe(false);
    });
  });
});
