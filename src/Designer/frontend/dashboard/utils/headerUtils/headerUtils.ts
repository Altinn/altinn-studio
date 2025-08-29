import type { HeaderMenuItem } from '../../types/HeaderMenuItem';
import { Subroute } from '../../enums/Subroute';
import { HeaderMenuItemKey } from '../../enums/HeaderMenuItemKey';
import { HeaderMenuGroupKey } from '../../enums/HeaderMenuGroupKey';
import type { HeaderMenuGroup } from '../../types/HeaderMenuGroup';
import type { NavigationMenuGroup } from '../../types/NavigationMenuGroup';
import { type StudioProfileMenuGroup } from '@studio/components-legacy';

export const dashboardHeaderMenuItems: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.AppDashboard,
    link: Subroute.AppDashboard,
    name: 'dashboard.header_item_dashboard',
    group: HeaderMenuGroupKey.Tools,
  },
  {
    key: HeaderMenuItemKey.OrgLibrary,
    link: Subroute.OrgLibrary,
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
): NavigationMenuGroup => ({
  name: menuGroup.groupName,
  showName: menuGroup.groupName === HeaderMenuGroupKey.Tools,
  items: menuGroup.menuItems.map((menuItem: HeaderMenuItem) => ({
    action: {
      type: 'link',
      href: menuItem.link,
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
