import type { HeaderMenuItem } from '../../types/HeaderMenuItem';
import { Subroute } from '../../enums/Subroute';
import { HeaderMenuItemKey } from '../../enums/HeaderMenuItemKey';

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
