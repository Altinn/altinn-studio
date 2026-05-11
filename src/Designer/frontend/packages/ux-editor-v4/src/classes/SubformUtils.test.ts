import { SubformUtilsImpl } from './SubformUtils';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

describe('SubformUtilsImpl', () => {
  describe('hasSubform', () => {
    it('should return false for hasSubforms when there are no subform layout sets', () => {
      const layoutSets: Array<LayoutSetConfig> = [{ id: '1' }];
      const subformUtils = new SubformUtilsImpl(layoutSets);
      expect(subformUtils.hasSubforms).toBe(false);
    });

    it('should return true for hasSubforms when there are subform layout sets', () => {
      const layoutSets: Array<LayoutSetConfig> = [{ id: '1', type: 'subform' }];
      const subformUtils = new SubformUtilsImpl(layoutSets);
      expect(subformUtils.hasSubforms).toBe(true);
    });
  });

  describe('subformLayoutSetsIds', () => {
    it('should return an empty array for subformLayoutSetsIds when there are no subform layout sets', () => {
      const layoutSets: Array<LayoutSetConfig> = [{ id: '1' }];
      const subformUtils = new SubformUtilsImpl(layoutSets);
      expect(subformUtils.subformLayoutSetsIds).toEqual([]);
    });

    it('should return the correct subform layout set IDs', () => {
      const layoutSets: Array<LayoutSetConfig> = [
        { id: '1', type: 'subform' },
        { id: '2' },
        { id: '3', type: 'subform' },
      ];
      const subformUtils = new SubformUtilsImpl(layoutSets);
      expect(subformUtils.subformLayoutSetsIds).toEqual(['1', '3']);
    });
  });
});
