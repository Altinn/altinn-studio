import { last, prepend, removeDuplicates } from './arrayUtils';

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
});
