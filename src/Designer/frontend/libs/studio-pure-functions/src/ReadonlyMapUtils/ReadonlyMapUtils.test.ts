import { ReadonlyMapUtils } from './ReadonlyMapUtils';

describe('ReadonlyMapUtils', () => {
  describe('updateValue', () => {
    it('Returns a map with the updated value for the given key', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      const updatedMap = ReadonlyMapUtils.updateValue(map, 'a', 3);
      expect(Array(...updatedMap)).toEqual([
        ['a', 3],
        ['b', 2],
      ]);
    });

    it('Creates a new instance', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      const updatedMap = ReadonlyMapUtils.updateValue(map, 'a', 3);
      expect(updatedMap).not.toBe(map);
    });
  });

  describe('prependEntry', () => {
    it('Returns a map with the given new entry at the start', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      const updatedMap = ReadonlyMapUtils.prependEntry(map, 'c', 3);
      expect(Array(...updatedMap)).toEqual([
        ['c', 3],
        ['a', 1],
        ['b', 2],
      ]);
    });

    it('Creates a new instance', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      const updatedMap = ReadonlyMapUtils.prependEntry(map, 'c', 3);
      expect(updatedMap).not.toBe(map);
    });
  });

  describe('deleteEntry', () => {
    it('Returns a map where the given key is removed', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      const updatedMap = ReadonlyMapUtils.deleteEntry(map, 'a');
      expect(Array(...updatedMap)).toEqual([['b', 2]]);
    });

    it('Creates a new instance', () => {
      const map = new Map<string, number>([
        ['a', 1],
        ['b', 2],
      ]);
      const updatedMap = ReadonlyMapUtils.deleteEntry(map, 'a');
      expect(updatedMap).not.toBe(map);
    });
  });
});
