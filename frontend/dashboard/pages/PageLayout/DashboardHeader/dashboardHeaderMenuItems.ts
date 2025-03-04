import { HeaderMenuItemKey } from '../../../enums/HeaderMenuItemKey';
import { Subroute } from '../../../context/HeaderContext';

export interface HeaderMenuItem {
  key: HeaderMenuItemKey;
  link: string;
  name: string;
}

export const dashboardHeaderMenuItems: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.OrgLibrary,
    link: Subroute.OrgLibrary,
    name: 'dashboard.header_item_library',
  },
  {
    key: HeaderMenuItemKey.AppDashboard,
    link: Subroute.AppDashboard,
    name: 'dashboard.header_item_dashboard',
  },
];
