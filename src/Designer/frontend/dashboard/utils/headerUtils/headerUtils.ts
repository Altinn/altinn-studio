import type { HeaderMenuItem } from '../../types/HeaderMenuItem';
import { Subroute } from '../../enums/Subroute';
import { HeaderMenuItemKey } from '../../enums/HeaderMenuItemKey';
import { HeaderMenuGroupKey } from '../../enums/HeaderMenuGroupKey';
import type { HeaderMenuGroup } from '../../types/HeaderMenuGroup';
import { isOrg } from '../orgUtils/orgUtils';
import type { NavigationMenuGroup } from '../../types/NavigationMenuGroup';
import { type StudioProfileMenuGroup } from '@studio/components';
import { FeatureFlag } from '@studio/feature-flags';
import { ADMIN_BASENAME, DASHBOARD_BASENAME } from 'app-shared/constants';

export const dashboardHeaderMenuItems: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.AppDashboard,
    getLink: (selectedContext: string = '') => `/${Subroute.AppDashboard}/${selectedContext}`,
    name: 'dashboard.header_item_dashboard',
    group: HeaderMenuGroupKey.Tools,
  },
  {
    key: HeaderMenuItemKey.Admin,
    getLink: (selectedContext: string = '') =>
      `${ADMIN_BASENAME}/${isOrg(selectedContext) ? selectedContext : ''}`,
    name: 'admin.apps.title',
    group: HeaderMenuGroupKey.Tools,
    featureFlag: FeatureFlag.Admin,
    isExternalLink: true,
  },
  {
    key: HeaderMenuItemKey.OrgLibrary,
    getLink: (selectedContext: string = '') => `/${Subroute.OrgLibrary}/${selectedContext}`,
    name: 'dashboard.header_item_library',
    group: HeaderMenuGroupKey.Tools,
    isBeta: true,
  },
];

export const groupMenuItemsByGroup = (menuItems: HeaderMenuItem[]): HeaderMenuGroup[] => {
  const groups: { [key: string]: HeaderMenuGroup } = {};

  menuItems.forEach((item: HeaderMenuItem) => {
    if (!groups[item.group]) {
      groups[item.group] = { groupName: item.group, menuItems: [] };
    }
    groups[item.group].menuItems.push(item);
  });

  return Object.values(groups);
};

export const mapHeaderMenuGroupToNavigationMenu = (
  menuGroup: HeaderMenuGroup,
  selectedContext: string = '',
): NavigationMenuGroup => ({
  name: menuGroup.groupName,
  showName: menuGroup.groupName === HeaderMenuGroupKey.Tools,
  items: menuGroup.menuItems.map((menuItem: HeaderMenuItem) => ({
    action: {
      type: 'link',
      href: `${menuItem.isExternalLink ? '' : DASHBOARD_BASENAME}${menuItem.getLink(selectedContext)}`,
    },
    itemName: menuItem.name,
  })),
});

export function mapNavigationMenuToProfileMenu(
  navigationGroups: NavigationMenuGroup[],
): StudioProfileMenuGroup[] {
  return navigationGroups.map(mapNavigationGroup);
}

function mapNavigationGroup(group: NavigationMenuGroup): StudioProfileMenuGroup {
  return {
    items: group.items,
  };
}
