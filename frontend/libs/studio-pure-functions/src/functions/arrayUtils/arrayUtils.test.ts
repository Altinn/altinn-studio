import { studioRemoveDuplicates } from './arrayUtils';

describe('arrayUtils', () => {
  describe('studioRemoveDuplicates', () => {
    it('Removes duplicates', () => {
      expect(studioRemoveDuplicates([1, 1, 2, 3, 3])).toEqual([1, 2, 3]);
      expect(studioRemoveDuplicates(['a', 'b', 'c', 'b'])).toEqual(['a', 'b', 'c']);
    });
  });
});
