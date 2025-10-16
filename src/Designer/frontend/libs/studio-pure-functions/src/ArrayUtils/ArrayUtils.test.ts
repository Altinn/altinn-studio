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

  describe('removeLast', () => {
    it('should remove last item from array', () => {
      const testData = [1, 2, 3];
      expect(ArrayUtils.removeLast(testData)).toEqual([1, 2]);
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

  describe('intersection', () => {
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

  describe('getNonEmptyArrayOrUndefined', () => {
    it('Returns array if it is not empty', () => {
      expect(ArrayUtils.getNonEmptyArrayOrUndefined([1, 2, 3])).toEqual([1, 2, 3]);
      expect(ArrayUtils.getNonEmptyArrayOrUndefined(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('Returns undefined if array is empty', () => {
      expect(ArrayUtils.getNonEmptyArrayOrUndefined([])).toBeUndefined();
    });
  });

  describe('prepend', () => {
    it('Prepends item to array', () => {
      expect(ArrayUtils.prepend([1, 2, 3], 0)).toEqual([0, 1, 2, 3]);
      expect(ArrayUtils.prepend(['a', 'b', 'c'], 'd')).toEqual(['d', 'a', 'b', 'c']);
    });
  });

  describe('isDuplicate', () => {
    it('Returns true when the given value is a duplicate within the array', () => {
      expect(ArrayUtils.isDuplicate(2, [1, 2, 3, 2])).toBe(true);
    });

    it('Returns false when the given value is unique within the array', () => {
      expect(ArrayUtils.isDuplicate(2, [1, 2, 3])).toBe(false);
    });

    it('Returns false when the given value is not present in the array', () => {
      expect(ArrayUtils.isDuplicate(4, [1, 2, 3])).toBe(false);
    });
  });

  describe('hasIntersection', () => {
    it('Returns true when arrays have one common element', () => {
      expect(ArrayUtils.hasIntersection([1, 2, 3], [3, 4, 5])).toBe(true);
    });

    it('Returns true when arrays have multiple common elements', () => {
      expect(ArrayUtils.hasIntersection([1, 2, 3], [3, 2, 5])).toBe(true);
    });

    it('Returns false when arrays have no common elements', () => {
      expect(ArrayUtils.hasIntersection([1, 2, 3], [4, 5, 6])).toBe(false);
    });

    it('Returns false when the arrays are empty', () => {
      expect(ArrayUtils.hasIntersection([], [])).toBe(false);
    });
  });

  describe('replaceLastItem', () => {
    it('should replace the last item in an array and return the modified array', () => {
      expect(ArrayUtils.replaceLastItem([1, 2, 3], 99)).toEqual([1, 2, 99]);
    });

    it('should handle arrays with only one item', () => {
      expect(ArrayUtils.replaceLastItem([5], 42)).toEqual([42]);
    });

    it('should return an empty array when called on an empty array', () => {
      expect(ArrayUtils.replaceLastItem([], 10)).toEqual([]);
    });
  });

  describe('areItemsUnique', () => {
    it('Returns true if all items are unique', () => {
      expect(ArrayUtils.areItemsUnique([1, 2, 3])).toBe(true);
      expect(ArrayUtils.areItemsUnique(['a', 'b', 'c'])).toBe(true);
      expect(ArrayUtils.areItemsUnique(['abc', 'bcd', 'cde'])).toBe(true);
      expect(ArrayUtils.areItemsUnique([true, false])).toBe(true);
      expect(ArrayUtils.areItemsUnique([1, 'b', true])).toBe(true);
      expect(ArrayUtils.areItemsUnique([0, '', false, null, undefined])).toBe(true);
    });

    it('Returns true if array is empty', () => {
      expect(ArrayUtils.areItemsUnique([])).toBe(true);
    });

    it('Returns false if there is at least one duplicated item', () => {
      expect(ArrayUtils.areItemsUnique([1, 2, 1])).toBe(false);
      expect(ArrayUtils.areItemsUnique(['a', 'a', 'c'])).toBe(false);
      expect(ArrayUtils.areItemsUnique(['abc', 'bcd', 'bcd'])).toBe(false);
      expect(ArrayUtils.areItemsUnique([true, false, true])).toBe(false);
      expect(ArrayUtils.areItemsUnique([1, 'b', false, 1])).toBe(false);
      expect(ArrayUtils.areItemsUnique([null, null])).toBe(false);
      expect(ArrayUtils.areItemsUnique([undefined, undefined])).toBe(false);
    });
  });

  describe('swapArrayElements', () => {
    it('Swaps two elements in an array', () => {
      const arr: string[] = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(ArrayUtils.swapArrayElements(arr, 'a', 'b')).toEqual(['b', 'a', 'c', 'd', 'e', 'f']);
    });
  });

  describe('insertArrayElementAtPos', () => {
    const arr = ['a', 'b', 'c'];

    it('Inserts element at given position', () => {
      expect(ArrayUtils.insertArrayElementAtPos(arr, 'M', 0)).toEqual(['M', 'a', 'b', 'c']);
      expect(ArrayUtils.insertArrayElementAtPos(arr, 'M', 1)).toEqual(['a', 'M', 'b', 'c']);
      expect(ArrayUtils.insertArrayElementAtPos(arr, 'M', 3)).toEqual(['a', 'b', 'c', 'M']);
    });

    it('Inserts element at the end if the position number is too large', () => {
      expect(ArrayUtils.insertArrayElementAtPos(arr, 'M', 9)).toEqual(['a', 'b', 'c', 'M']);
    });

    it('Inserts element at the end if the position number is negative', () => {
      expect(ArrayUtils.insertArrayElementAtPos(arr, 'M', -1)).toEqual(['a', 'b', 'c', 'M']);
    });
  });

  describe('mapByKey', () => {
    it('Returns an array of values mapped by the given key', () => {
      const array = [
        { a: 1, b: 2 },
        { a: 2, b: 'c' },
        { a: 3, b: true, c: 'abc' },
      ];
      expect(ArrayUtils.mapByKey(array, 'a')).toEqual([1, 2, 3]);
    });
  });

  describe('replaceByPredicate', () => {
    it('Replaces the first item matching the predicate with the given item', () => {
      const array = ['test1', 'test2', 'test3'];
      const predicate = (item: string) => item === 'test2';
      const replaceWith = 'test4';
      expect(ArrayUtils.replaceByPredicate(array, predicate, replaceWith)).toEqual([
        'test1',
        'test4',
        'test3',
      ]);
    });
  });

  describe('replaceItemsByValue', () => {
    it('Replaces all items matching the given value with the given replacement', () => {
      const array = ['a', 'b', 'c'];
      expect(ArrayUtils.replaceItemsByValue(array, 'b', 'd')).toEqual(['a', 'd', 'c']);
    });
  });

  describe('moveArrayItem', () => {
    it('Moves the item at the given index to the given position when the new position is BEFORE', () => {
      const array = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(ArrayUtils.moveArrayItem(array, 4, 1)).toEqual(['a', 'e', 'b', 'c', 'd', 'f']);
    });

    it('Moves the item at the given index to the given position when the new position is after', () => {
      const array = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(ArrayUtils.moveArrayItem(array, 1, 4)).toEqual(['a', 'c', 'd', 'e', 'b', 'f']);
    });

    it('Keeps the array unchanged if the two indices are the same', () => {
      const array = ['a', 'b', 'c', 'd', 'e', 'f'];
      expect(ArrayUtils.moveArrayItem(array, 1, 1)).toEqual(array);
    });
  });

  describe('generateUniqueStringWithNumber', () => {
    it('Returns prefix + 0 when the array is empty', () => {
      expect(ArrayUtils.generateUniqueStringWithNumber([], 'prefix')).toBe('prefix0');
    });

    it('Returns prefix + 0 when the array does not contain this value already', () => {
      const array = ['something', 'something else'];
      expect(ArrayUtils.generateUniqueStringWithNumber(array, 'prefix')).toBe('prefix0');
    });

    it('Returns prefix + number based on the existing values', () => {
      const array = ['prefix0', 'prefix1', 'prefix2'];
      expect(ArrayUtils.generateUniqueStringWithNumber(array, 'prefix')).toBe('prefix3');
    });

    it('Returns number only when the prefix is empty', () => {
      const array = ['0', '1', '2'];
      expect(ArrayUtils.generateUniqueStringWithNumber(array)).toBe('3');
    });
  });

  describe('removeEmptyStrings', () => {
    it('Removes empty strings from an array', () => {
      const array = ['0', '1', '', '2', ''];
      expect(ArrayUtils.removeEmptyStrings(array)).toEqual(['0', '1', '2']);
    });
  });

  describe('extractUniqueTypes', () => {
    it('returns array with one occurence of every type from input array', () => {
      const array = ['hello', 'world', 1, 2, true, false, {}, null, undefined];
      expect(ArrayUtils.extractUniqueTypes(array)).toEqual([
        'string',
        'number',
        'boolean',
        'object',
        'undefined',
      ]);
    });
  });

  describe('hasSingleType', () => {
    it('returns true for an array with all strings', () => {
      expect(ArrayUtils.hasSingleType(['a', 'b', 'c'])).toBe(true);
    });

    it('returns true for an array with all numbers', () => {
      expect(ArrayUtils.hasSingleType([1, 2, 3])).toBe(true);
    });

    it('returns false for an array with mixed types', () => {
      expect(ArrayUtils.hasSingleType([1, 'a', true])).toBe(false);
    });

    it('returns false for an empty array', () => {
      expect(ArrayUtils.hasSingleType([])).toBe(false);
    });
  });

  describe('toString', () => {
    it('returns a string with all elements separated by comma when no delimiter is provided', () => {
      expect(ArrayUtils.toString(['a', 'b', 'c'])).toBe('a,b,c');
    });

    it('returns an empty string for an empty array', () => {
      expect(ArrayUtils.toString([])).toBe('');
    });

    it('returns a string with all elements separated by the given separator', () => {
      expect(ArrayUtils.toString(['a', 'b', 'c'], '|')).toBe('a|b|c');
    });
  });

  describe('getArrayFromString', () => {
    it('returns an array of strings when the input string is comma-separated', () => {
      expect(ArrayUtils.getArrayFromString('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('returns an array with the input string as the only element when no separator is found', () => {
      expect(ArrayUtils.getArrayFromString('abc')).toEqual(['abc']);
    });

    it('returns an empty array when the input string is empty', () => {
      expect(ArrayUtils.getArrayFromString('')).toEqual([]);
    });

    it('trims any whitespace around the elements', () => {
      expect(ArrayUtils.getArrayFromString(' a, b, c ')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('extractKeyValuePairs', () => {
    it('Returns an empty object when the input array is empty', () => {
      expect(ArrayUtils.extractKeyValuePairs([], 'key', 'value')).toEqual({});
    });

    it('Returns an object with key-value pairs from the input array', () => {
      type TestObject = { key: string; value: string };
      const array: TestObject[] = [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
        { key: 'c', value: '3' },
      ];
      const result = ArrayUtils.extractKeyValuePairs<TestObject, 'key', 'value'>(
        array,
        'key',
        'value',
      );
      expect(result).toEqual({ a: '1', b: '2', c: '3' });
    });
  });

  describe('arraysEqualUnordered', () => {
    it('Returns true when the arrays have the same values in the same order', () => {
      expect(ArrayUtils.arraysEqualUnordered([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(ArrayUtils.arraysEqualUnordered(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(true);
    });

    it('Returns true when the arrays have the same values in different order', () => {
      expect(ArrayUtils.arraysEqualUnordered([1, 2, 3], [2, 1, 3])).toBe(true);
      expect(ArrayUtils.arraysEqualUnordered(['a', 'b', 'c'], ['c', 'b', 'a'])).toBe(true);
    });

    it('Returns false when the arrays have different values', () => {
      expect(ArrayUtils.arraysEqualUnordered([1, 2, 3], [4, 5, 6])).toBe(false);
      expect(ArrayUtils.arraysEqualUnordered(['a', 'b', 'c'], ['d', 'e', 'f'])).toBe(false);
    });

    it('Returns false when the arrays have different lengths', () => {
      expect(ArrayUtils.arraysEqualUnordered([1, 2], [1, 2, 3])).toBe(false);
      expect(ArrayUtils.arraysEqualUnordered(['a', 'b'], ['a', 'b', 'c'])).toBe(false);
    });

    it('Returns false when one array is empty', () => {
      expect(ArrayUtils.arraysEqualUnordered([1, 2, 3], [])).toBe(false);
      expect(ArrayUtils.arraysEqualUnordered([], [1, 2, 3])).toBe(false);
    });

    it('Returns true when both arrays are empty', () => {
      expect(ArrayUtils.arraysEqualUnordered([], [])).toBe(true);
    });

    it('Returns true when both arrays have the same single value', () => {
      expect(ArrayUtils.arraysEqualUnordered([1], [1])).toBe(true);
      expect(ArrayUtils.arraysEqualUnordered(['a'], ['a'])).toBe(true);
    });
  });

  describe('isArrayOfStrings', () => {
    it('Returns true when the argument is an array of strings only', () => {
      expect(ArrayUtils.isArrayOfStrings(['a', 'b', 'c'])).toBe(true);
      expect(ArrayUtils.isArrayOfStrings([])).toBe(true);
    });

    it('Returns false when the argument is an array, but not only strings', () => {
      expect(ArrayUtils.isArrayOfStrings(['a', 2, 'c'])).toBe(false);
    });

    it('Returns false when the argument is not an array', () => {
      expect(ArrayUtils.isArrayOfStrings('abc')).toBe(false);
    });
  });
});
