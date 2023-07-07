import type { ILayoutCompBase, ISelectionComponent } from 'src/layout/layout';
import type { LayoutStyle } from 'src/types';

export type ILayoutCompCheckboxes = ILayoutCompBase<'Checkboxes'> &
  ISelectionComponent & {
    layout?: LayoutStyle;
  };
