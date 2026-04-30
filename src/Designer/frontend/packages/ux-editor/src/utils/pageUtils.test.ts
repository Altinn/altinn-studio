import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { findFirstPage } from './pageUtils';

describe('pageUtils', () => {
  describe('findFirstPage', () => {
    it('should return undefined when pagesModel is undefined', () => {
      expect(findFirstPage(undefined)).toBeUndefined();
    });

    it('should return first page id from pages array when model has pages', () => {
      const pagesModel: PagesModel = {
        pages: [{ id: 'page1' }, { id: 'page2' }, { id: 'page3' }],
      };
      expect(findFirstPage(pagesModel)).toBe('page1');
    });

    it('should return first page id from first group when model has groups', () => {
      const pagesModel: PagesModel = {
        groups: [
          { order: [{ id: 'group1-page1' }, { id: 'group1-page2' }] },
          { order: [{ id: 'group2-page1' }] },
        ],
      };
      expect(findFirstPage(pagesModel)).toBe('group1-page1');
    });
  });
});
