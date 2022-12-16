import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompPanelBase {
  variant?: 'info' | 'warning' | 'error' | 'success';
  showIcon?: boolean;
}

export interface IGroupReference {
  group: string;
}

export interface IGroupPanel extends ILayoutCompPanelBase {
  iconUrl?: string;
  iconAlt?: string;
  groupReference?: IGroupReference;
}

export type ILayoutCompPanel = ILayoutCompBase<'Panel'> & ILayoutCompPanelBase;
