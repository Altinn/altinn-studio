import { ViewSize } from './types/ViewSize';
import type { GridSizes } from './types/GridSizes';
import { findEffectiveGridSize } from './utils';

describe('utils', () => {
  describe('findEffectiveGridSize', () => {
    it('Returns correct value', () => {
      const gridSizes: GridSizes = {
        [ViewSize.Xs]: 12,
        [ViewSize.Md]: 6,
      };
      expect(findEffectiveGridSize(gridSizes, ViewSize.Xs)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.Sm)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.Md)).toBe(6);
      expect(findEffectiveGridSize(gridSizes, ViewSize.Lg)).toBe(6);
      expect(findEffectiveGridSize(gridSizes, ViewSize.Xl)).toBe(6);
    });

    it('Returns 12 when no grid values are set', () => {
      const gridSizes: GridSizes = {};
      expect(findEffectiveGridSize(gridSizes, ViewSize.Xs)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.Sm)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.Md)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.Lg)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.Xl)).toBe(12);
    });

    it('Returns 12 when no grid values on view sizes below the current one are set', () => {
      const gridSizes: GridSizes = {
        [ViewSize.Xl]: 6,
      };
      expect(findEffectiveGridSize(gridSizes, ViewSize.Xs)).toBe(12);
    });
  });
});
