import { type HeaderContextType } from 'dashboard/context/HeaderContext';
import { userMock } from './userMock';
import { mockOrganizations } from './organizationMock';
import type { HeaderMenuItem } from 'dashboard/types/HeaderMenuItem';
import { HeaderMenuItemKey } from 'dashboard/enums/HeaderMenuItemKey';
import { HeaderMenuGroupKey } from 'dashboard/enums/HeaderMenuGroupKey';
import { type NavigationMenuItem } from 'dashboard/types/NavigationMenuItem';
import { type NavigationMenuGroup } from 'dashboard/types/NavigationMenuGroup';

const menuItemsMock: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.OrgLibrary,
    link: '/a',
    group: HeaderMenuGroupKey.Other,
    name: 'org-library',
  },
  {
    key: HeaderMenuItemKey.AppDashboard,
    link: '/b',
    group: HeaderMenuGroupKey.Other,
    name: 'app-dashboard',
  },
];

const navigationMenuItem1: NavigationMenuItem = {
  action: { type: 'button', onClick: () => {} },
  name: 'test',
};
export const profileMenuItemsMock: NavigationMenuItem[] = [navigationMenuItem1];

export const profileMenuGroupsMock: NavigationMenuGroup[] = [
  { name: 'testGroup', showName: true, items: [navigationMenuItem1] },
];

export const headerContextValueMock: HeaderContextType = {
  user: userMock,
  selectableOrgs: mockOrganizations,
  menuItems: menuItemsMock,
  profileMenuItems: profileMenuItemsMock,
  profileMenuGroups: profileMenuGroupsMock,
};
