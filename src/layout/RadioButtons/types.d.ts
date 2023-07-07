import type { ILayoutCompBase, ISelectionComponent } from 'src/layout/layout';
import type { LayoutStyle } from 'src/types';

export type ILayoutCompRadioButtons = ILayoutCompBase<'RadioButtons'> &
  ISelectionComponent & {
    layout?: LayoutStyle;
    showAsCard?: boolean;
  };
