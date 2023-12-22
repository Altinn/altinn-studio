import { ViewSize } from './types/ViewSize';
import { GridSizes } from './types/GridSizes';
import { findEffectiveGridSize } from './utils';

describe('utils', () => {
  describe('findEffectiveGridSize', () => {
    it('Returns correct value', () => {
      const gridSizes: GridSizes = {
        [ViewSize.xs]: 12,
        [ViewSize.md]: 6,
      };
      expect(findEffectiveGridSize(gridSizes, ViewSize.xs)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.sm)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.md)).toBe(6);
      expect(findEffectiveGridSize(gridSizes, ViewSize.lg)).toBe(6);
      expect(findEffectiveGridSize(gridSizes, ViewSize.xl)).toBe(6);
    });

    it('Returns 12 when no grid values are set', () => {
      const gridSizes: GridSizes = {};
      expect(findEffectiveGridSize(gridSizes, ViewSize.xs)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.sm)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.md)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.lg)).toBe(12);
      expect(findEffectiveGridSize(gridSizes, ViewSize.xl)).toBe(12);
    });

    it('Returns 12 when no grid values on view sizes below the current one are set', () => {
      const gridSizes: GridSizes = {
        [ViewSize.xl]: 6,
      };
      expect(findEffectiveGridSize(gridSizes, ViewSize.xs)).toBe(12);
    });
  });
});
