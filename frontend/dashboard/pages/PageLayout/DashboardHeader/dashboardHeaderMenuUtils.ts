import type React from 'react';
import { SubRoute } from '../../../context/HeaderContext';

enum HeaderMenuItemKey {
  OrgLibrary = 'orgLibrary',
  AppDashboard = 'appDashboard',
}

export interface HeaderMenuItem {
  key: HeaderMenuItemKey;
  link: string;
  name: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

export const dashboardHeaderMenuItems: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.OrgLibrary,
    link: SubRoute.OrgLibrary,
    name: 'dashboard.library',
  },
  {
    key: HeaderMenuItemKey.AppDashboard,
    link: SubRoute.AppDashboard,
    name: 'dashboard.apps',
  },
];
