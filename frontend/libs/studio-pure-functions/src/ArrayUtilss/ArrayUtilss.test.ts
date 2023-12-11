import { ArrayUtils } from './ArrayUtilss';

describe('ArrayUtils', () => {
  describe('removeDuplicates', () => {
    it('Removes duplicates', () => {
      expect(ArrayUtils.removeDuplicates([1, 1, 2, 3, 3])).toEqual([1, 2, 3]);
      expect(ArrayUtils.removeDuplicates(['a', 'b', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });
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
