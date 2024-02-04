import type { GridSizes } from './types/GridSizes';
import { ViewSize } from './types/ViewSize';
import type { GridSize } from '@studio/components';

export const findEffectiveGridSize = (
  selectedViewSizes: GridSizes,
  currentViewSize: ViewSize,
): GridSize => {
  switch (currentViewSize) {
    case ViewSize.Xs:
      return selectedViewSizes[ViewSize.Xs] || 12;
    case ViewSize.Sm:
      return selectedViewSizes[ViewSize.Sm] || selectedViewSizes[ViewSize.Xs] || 12;
    case ViewSize.Md:
      return (
        selectedViewSizes[ViewSize.Md] ||
        selectedViewSizes[ViewSize.Sm] ||
        selectedViewSizes[ViewSize.Xs] ||
        12
      );
    case ViewSize.Lg:
      return (
        selectedViewSizes[ViewSize.Lg] ||
        selectedViewSizes[ViewSize.Md] ||
        selectedViewSizes[ViewSize.Sm] ||
        selectedViewSizes[ViewSize.Xs] ||
        12
      );
    case ViewSize.Xl:
      return (
        selectedViewSizes[ViewSize.Xl] ||
        selectedViewSizes[ViewSize.Lg] ||
        selectedViewSizes[ViewSize.Md] ||
        selectedViewSizes[ViewSize.Sm] ||
        selectedViewSizes[ViewSize.Xs] ||
        12
      );
  }
};
