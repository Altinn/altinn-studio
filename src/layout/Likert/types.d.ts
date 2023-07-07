import type { ILayoutCompBase, ISelectionComponent } from 'src/layout/layout';
import type { LayoutStyle } from 'src/types';

export type ILayoutCompLikert = ILayoutCompBase<'Likert'> &
  ISelectionComponent & {
    layout?: LayoutStyle;
    showAsCard?: boolean;
  };
