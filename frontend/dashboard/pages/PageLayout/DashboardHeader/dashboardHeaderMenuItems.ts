import { Subroute } from '../../../context/HeaderContext';

enum HeaderMenuItemKey {
  OrgLibrary = 'orgLibrary',
  AppDashboard = 'appDashboard',
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
    name: 'dashboard.library',
  },
  {
    key: HeaderMenuItemKey.AppDashboard,
    link: Subroute.AppDashboard,
    name: 'dashboard.apps',
  },
];
