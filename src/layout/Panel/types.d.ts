import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompPanelBase {
  variant?: 'info' | 'warning' | 'error' | 'success';
  showIcon?: boolean;
}

export type ILayoutCompPanel = ILayoutCompBase<'Panel'> & ILayoutCompPanelBase;
