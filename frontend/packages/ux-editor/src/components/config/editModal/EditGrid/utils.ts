import { GridSizes } from './types/GridSizes';
import { ViewSize } from './types/ViewSize';
import { GridSize } from '@studio/components';

export const findEffectiveGridSize = (
  selectedViewSizes: GridSizes,
  currentViewSize: ViewSize,
): GridSize => {
  switch (currentViewSize) {
    case ViewSize.xs:
      return selectedViewSizes[ViewSize.xs] || 12;
    case ViewSize.sm:
      return selectedViewSizes[ViewSize.sm] || selectedViewSizes[ViewSize.xs] || 12;
    case ViewSize.md:
      return (
        selectedViewSizes[ViewSize.md] ||
        selectedViewSizes[ViewSize.sm] ||
        selectedViewSizes[ViewSize.xs] ||
        12
      );
    case ViewSize.lg:
      return (
        selectedViewSizes[ViewSize.lg] ||
        selectedViewSizes[ViewSize.md] ||
        selectedViewSizes[ViewSize.sm] ||
        selectedViewSizes[ViewSize.xs] ||
        12
      );
    case ViewSize.xl:
      return (
        selectedViewSizes[ViewSize.xl] ||
        selectedViewSizes[ViewSize.lg] ||
        selectedViewSizes[ViewSize.md] ||
        selectedViewSizes[ViewSize.sm] ||
        selectedViewSizes[ViewSize.xs] ||
        12
      );
  }
};
