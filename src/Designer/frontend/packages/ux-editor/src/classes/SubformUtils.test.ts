import { SubformUtilsImpl } from './SubformUtils';
import type { LayoutSetResponse } from 'app-shared/utils/layoutSetsUtils';

describe('SubformUtilsImpl', () => {
  describe('hasSubform', () => {
    it('should return false for hasSubforms when there are no subform layout sets', () => {
      const layoutSets: LayoutSetResponse[] = [{ id: '1', dataType: '', type: '' }];
      const subformUtils = new SubformUtilsImpl(layoutSets);
      expect(subformUtils.hasSubforms).toBe(false);
    });

    it('should return true for hasSubforms when there are subform layout sets', () => {
      const layoutSets: LayoutSetResponse[] = [{ id: '1', dataType: '', type: 'subform' }];
      const subformUtils = new SubformUtilsImpl(layoutSets);
      expect(subformUtils.hasSubforms).toBe(true);
    });
  });

  describe('subformLayoutSetsIds', () => {
    it('should return an empty array for subformLayoutSetsIds when there are no subform layout sets', () => {
      const layoutSets: LayoutSetResponse[] = [{ id: '1', dataType: '', type: '' }];
      const subformUtils = new SubformUtilsImpl(layoutSets);
      expect(subformUtils.subformLayoutSetsIds).toEqual([]);
    });

    it('should return the correct subform layout set IDs', () => {
      const layoutSets: LayoutSetResponse[] = [
        { id: '1', dataType: '', type: 'subform' },
        { id: '2', dataType: '', type: '' },
        { id: '3', dataType: '', type: 'subform' },
      ];
      const subformUtils = new SubformUtilsImpl(layoutSets);
      expect(subformUtils.subformLayoutSetsIds).toEqual(['1', '3']);
    });
  });
});
