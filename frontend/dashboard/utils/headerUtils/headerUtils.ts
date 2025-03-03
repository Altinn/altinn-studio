import type { HeaderMenuItem } from '../../types/HeaderMenuItem';
import { Subroute } from '../../enums/SubRoute';
import { HeaderMenuItemKey } from '../../enums/HeaderMenuItemKey';
import { HeaderMenuGroupKey } from '../../enums/HeaderMenuGroupKey';
import type { HeaderMenuGroup } from '../../types/HeaderMenuGroup';
import type { NavigationMenuGroup } from '../../types/NavigationMenuGroup';

export const dashboardHeaderMenuItems: HeaderMenuItem[] = [
  {
    key: HeaderMenuItemKey.OrgLibrary,
    link: Subroute.OrgLibrary,
    name: 'dashboard.header_item_library',
    group: HeaderMenuGroupKey.Tools,
  },
  {
    key: HeaderMenuItemKey.AppDashboard,
    link: Subroute.AppDashboard,
    name: 'dashboard.header_item_dashboard',
    group: HeaderMenuGroupKey.Tools,
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
    name: menuItem.key,
  })),
});

export function extractLastRouterParam(pathname: string): string {
  const pathnameArray = pathname.split('/');
  const lastParam: string = pathnameArray[pathnameArray.length - 1];
  return lastParam;
}

export function extractSecondLastRouterParam(pathname: string): string {
  const pathnameArray = pathname.split('/');
  const secondLastParam: string | undefined = pathnameArray[pathnameArray.length - 2];

  if (secondLastParam) return secondLastParam;
  return '';
}
