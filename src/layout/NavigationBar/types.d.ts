import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompNavBar extends ILayoutCompBase<'NavigationBar'> {
  compact?: boolean;
}
