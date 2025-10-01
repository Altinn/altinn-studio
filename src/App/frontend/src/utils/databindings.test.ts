import { getKeyIndex, getKeyWithoutIndex } from 'src/utils/databindings';

describe('utils/databindings.ts', () => {
  describe('getKeyIndex', () => {
    it('should return key indexes from string', () => {
      expect(getKeyIndex('Group[1].Group2[0].group2prop')).toEqual([1, 0]);
    });
  });

  describe('getKeyWithouthIndex', () => {
    it('should return stripped formdata key for nested groups', () => {
      const withIndex = 'somegroup[0].someprop.someothergroup[2].someotherprop';
      const expected = 'somegroup.someprop.someothergroup.someotherprop';
      const result = getKeyWithoutIndex(withIndex);
      expect(result).toEqual(expected);
    });
  });
});
