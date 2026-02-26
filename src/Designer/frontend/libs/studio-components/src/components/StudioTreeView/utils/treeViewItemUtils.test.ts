import { focusableNodeId } from './treeViewItemUtils';

describe('treeViewItemUtils', () => {
  describe('focusableNodeId', () => {
    it('Returns focusedId if set', () => {
      const focusedId = 'focusedId';
      const firstItemId = 'firstItemId';
      const anotherId = 'anotherId';
      expect(focusableNodeId(focusedId, undefined, firstItemId)).toBe(focusedId);
      expect(focusableNodeId(focusedId, anotherId, firstItemId)).toBe(focusedId);
    });

    it('Returns selectedId if selectedId is set, but not focusedId', () => {
      const selectedId = 'selectedId';
      const firstItemId = 'firstItemId';
      expect(focusableNodeId(undefined, selectedId, firstItemId)).toBe(selectedId);
    });

    it('Returns firstItemId if neither focusedId nor selectedId are set', () => {
      const firstItemId = 'firstItemId';
      expect(focusableNodeId(undefined, undefined, firstItemId)).toBe(firstItemId);
    });

    it('Returns null if there are no nodes', () => {
      expect(focusableNodeId(undefined, undefined, null)).toBe(null);
    });
  });
});
