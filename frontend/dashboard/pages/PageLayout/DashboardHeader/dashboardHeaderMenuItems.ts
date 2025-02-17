import { Subroute } from '../../../context/HeaderContext';

export enum HeaderMenuItemKey {
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
    name: 'dashboard.library',
  },
  {
    key: HeaderMenuItemKey.AppDashboard,
    link: Subroute.AppDashboard,
    name: 'dashboard.apps',
  },
];
