import { Subroute } from '../../../enums/Subroute';

enum HeaderMenuItemKey {
  OrgLibrary = 'org-library',
  AppDashboard = 'app-dashboard',
}

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
