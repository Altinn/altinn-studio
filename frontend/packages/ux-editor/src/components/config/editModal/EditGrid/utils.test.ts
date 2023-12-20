import { ViewSize } from './types/ViewSize';
import { GridSizes } from './types/GridSizes';
import { findLargestSelectedViewsizeBelowCurrent } from './utils';

describe('utils', () => {
  describe('findLargestSelectedViewsizeBelowCurrent', () => {
    it('Returns correct value', () => {
      const gridSizes: GridSizes = {
        [ViewSize.xs]: 12,
        [ViewSize.md]: 6,
      };
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.xs)).toBe(12);
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.sm)).toBe(12);
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.md)).toBe(6);
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.lg)).toBe(6);
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.xl)).toBe(6);
    });

    it('Returns 12 when no grid values are set', () => {
      const gridSizes: GridSizes = {};
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.xs)).toBe(12);
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.sm)).toBe(12);
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.md)).toBe(12);
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.lg)).toBe(12);
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.xl)).toBe(12);
    });

    it('Returns 12 when no grid values on view sizes below the current one are set', () => {
      const gridSizes: GridSizes = {
        [ViewSize.xl]: 6,
      };
      expect(findLargestSelectedViewsizeBelowCurrent(gridSizes, ViewSize.xs)).toBe(12);
    });
  });
});
