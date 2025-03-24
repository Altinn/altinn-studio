import { type HeaderContextProps } from '../context/HeaderContext';
import { userMock } from './userMock';
import { mockOrganizations } from './organizationMock';
import type { HeaderMenuItem } from '../types/HeaderMenuItem';
import { HeaderMenuItemKey } from '../enums/HeaderMenuItemKey';
import { HeaderMenuGroupKey } from '../enums/HeaderMenuGroupKey';
import { type NavigationMenuItem } from '../types/NavigationMenuItem';
import { type NavigationMenuGroup } from '../types/NavigationMenuGroup';

const menuItemsMock: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.OrgLibrary,
    link: '/a/ttd',
    group: HeaderMenuGroupKey.Tools,
    name: 'org-library',
  },
  {
    key: HeaderMenuItemKey.AppDashboard,
    link: '/b/ttd',
    group: HeaderMenuGroupKey.Tools,
    name: 'app-dashboard',
  },
];

const navigationMenuItem1: NavigationMenuItem = {
  action: { type: 'button', onClick: () => {} },
  itemName: 'test',
};
export const profileMenuItemsMock: NavigationMenuItem[] = [navigationMenuItem1];

export const profileMenuGroupsMock: NavigationMenuGroup[] = [
  { name: 'testGroup', showName: true, items: [navigationMenuItem1] },
];

export const headerContextValueMock: HeaderContextProps = {
  user: userMock,
  selectableOrgs: mockOrganizations,
  menuItems: menuItemsMock,
  profileMenuItems: profileMenuItemsMock,
  profileMenuGroups: profileMenuGroupsMock,
};
