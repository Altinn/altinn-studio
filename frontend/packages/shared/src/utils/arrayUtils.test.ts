import {
  areItemsUnique,
  arrayIntersection,
  generateUniqueStringWithNumber,
  insertArrayElementAtPos,
  last,
  mapByKey,
  moveArrayItem,
  prepend,
  removeDuplicates,
  removeItemByValue,
  replaceByPredicate,
  replaceItemsByValue,
  swapArrayElements,
} from './arrayUtils';

describe('arrayUtils', () => {
  describe('removeDuplicates', () => {
    it('Removes duplicates', () => {
      expect(removeDuplicates([1, 1, 2, 3, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates(['a', 'b', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });

    it('Returns equal array if there are no duplicates', () => {
      expect(removeDuplicates([1, 2, 3])).toEqual([1, 2, 3]);
      expect(removeDuplicates(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(removeDuplicates([1, 2, 3, '3'])).toEqual([1, 2, 3, '3']);
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

  describe('insertArrayElementAtPos', () => {
    const arr = ['a', 'b', 'c'];

    it('Inserts element at given position', () => {
      expect(insertArrayElementAtPos(arr, 'M', 0)).toEqual(['M', 'a', 'b', 'c']);
      expect(insertArrayElementAtPos(arr, 'M', 1)).toEqual(['a', 'M', 'b', 'c']);
      expect(insertArrayElementAtPos(arr, 'M', 3)).toEqual(['a', 'b', 'c', 'M']);
    });

    it('Inserts element at the end if the position number is too large', () => {
      expect(insertArrayElementAtPos(arr, 'M', 9)).toEqual(['a', 'b', 'c', 'M']);
    });

    it('Inserts element at the end if the position number is negative', () => {
      expect(insertArrayElementAtPos(arr, 'M', -1)).toEqual(['a', 'b', 'c', 'M']);
    });
  });

  describe('swapArrayElements', () => {
    it('Swaps two elements in an array', () => {
      const arr: string[] = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(swapArrayElements(arr, 'a', 'b')).toEqual(['b', 'a', 'c', 'd', 'e', 'f']);
    });
  });

  describe('arrayIntersection', () => {
    it('Returns intersection of two arrays', () => {
      expect(arrayIntersection([1, 2, 3], [3, '4', 5])).toStrictEqual([3]);
      expect(arrayIntersection([1, 2, 3], [4, '4', 5])).toStrictEqual([]);
      expect(arrayIntersection([1, 2, 3], [3, '4', 2])).toStrictEqual([2, 3]);
      expect(arrayIntersection([1, 2, 3], [1, 2, 3])).toStrictEqual([1, 2, 3]);
    });
  });

  describe('mapByKey', () => {
    it('Returns an array of values mapped by the given key', () => {
      const array = [
        { a: 1, b: 2 },
        { a: 2, b: 'c' },
        { a: 3, b: true, c: 'abc' },
      ];
      expect(mapByKey(array, 'a')).toEqual([1, 2, 3]);
    });
  });

  describe('rplaceItemsByValue', () => {
    it('Replaces all items matching the given value with the given replacement', () => {
      const array = ['a', 'b', 'c'];
      expect(replaceItemsByValue(array, 'b', 'd')).toEqual(['a', 'd', 'c']);
    });
  });

  describe('replaceByPredicate', () => {
    it('Replaces the first item matching the predicate with the given item', () => {
      const array = ['test1', 'test2', 'test3'];
      const predicate = (item: string) => item === 'test2';
      const replaceWith = 'test4';
      expect(replaceByPredicate(array, predicate, replaceWith)).toEqual([
        'test1',
        'test4',
        'test3',
      ]);
    });
  });

  describe('moveArrayItem', () => {
    it('Moves the item at the given index to the given position when the new position is BEFORE', () => {
      const array = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(moveArrayItem(array, 4, 1)).toEqual(['a', 'e', 'b', 'c', 'd', 'f']);
    });

    it('Moves the item at the given index to the given position when the new position is after', () => {
      const array = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(moveArrayItem(array, 1, 4)).toEqual(['a', 'c', 'd', 'e', 'b', 'f']);
    });

    it('Keeps the array unchanged if the two indices are the same', () => {
      const array = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(moveArrayItem(array, 1, 1)).toEqual(array);
    });
  });

  describe('generateUniqueStringWithNumber', () => {
    it('Returns prefix + 0 when the array is empty', () => {
      expect(generateUniqueStringWithNumber([], 'prefix')).toBe('prefix0');
    });

    it('Returns prefix + 0 when the array does not contain this value already', () => {
      const array = ['something', 'something else'];
      expect(generateUniqueStringWithNumber(array, 'prefix')).toBe('prefix0');
    });

    it('Returns prefix + number based on the existing values', () => {
      const array = ['prefix0', 'prefix1', 'prefix2'];
      expect(generateUniqueStringWithNumber(array, 'prefix')).toBe('prefix3');
    });

    it('Returns number only when the prefix is empty', () => {
      const array = ['0', '1', '2'];
      expect(generateUniqueStringWithNumber(array)).toBe('3');
    });
  });
});
