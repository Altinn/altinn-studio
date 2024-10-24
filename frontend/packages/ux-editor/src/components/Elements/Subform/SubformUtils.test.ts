import { SubformUtils } from './SubformUtils';
import type { LayoutSet } from 'app-shared/types/api/LayoutSetsResponse';

describe('SubformUtils', () => {
  describe('findSubformById', () => {
    const layoutSets: Array<LayoutSet> = [{ id: '1' }, { id: '2', type: 'subform' }, { id: '3' }];

    it('should return the layout set when it is a subform', () => {
      const result = SubformUtils.findSubformById(layoutSets, '2');
      expect(result).toEqual({ id: '2', type: 'subform' });
    });

    it('should return null when the layout set is not a subform', () => {
      const result = SubformUtils.findSubformById(layoutSets, '1');
      expect(result).toBeNull();
    });

    it('should return null when the layout set is not found', () => {
      const result = SubformUtils.findSubformById(layoutSets, 'non-existent-id');
      expect(result).toBeNull();
    });
  });
});
