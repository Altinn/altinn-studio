import {
  groupMenuItemsByGroup,
  mapHeaderMenuGroupToNavigationMenu,
  dashboardHeaderMenuItems,
  mapNavigationMenuToProfileMenu,
} from './headerUtils';
import { HeaderMenuGroupKey } from '../../enums/HeaderMenuGroupKey';
import { HeaderMenuItemKey } from '../../enums/HeaderMenuItemKey';
import type { NavigationMenuGroup } from '../../types/NavigationMenuGroup';
import type { StudioProfileMenuGroup } from '@studio/components-legacy';
import type { NavigationMenuItem } from '../../types/NavigationMenuItem';

describe('headerMenuUtils', () => {
  describe('groupMenuItemsByGroup', () => {
    it('should group items by their group key', () => {
      const groupedItems = groupMenuItemsByGroup(dashboardHeaderMenuItems);
      expect(groupedItems.length).toBeGreaterThan(0);

      groupedItems.forEach((group) => {
        group.menuItems.forEach((item) => {
          expect(item.group).toBe(group.groupName);
        });
      });
    });
  });

  describe('mapHeaderMenuGroupToNavigationMenu', () => {
    it('should correctly map header menu group to navigation menu group', () => {
      const group = {
        groupName: HeaderMenuGroupKey.Tools,
        menuItems: [
          dashboardHeaderMenuItems.find((item) => item.key === HeaderMenuItemKey.AppDashboard)!,
        ],
      };
      const mappedGroup = mapHeaderMenuGroupToNavigationMenu(group);
      expect(mappedGroup.name).toBe(HeaderMenuGroupKey.Tools);
      expect(mappedGroup.items.length).toBe(1);
      expect(mappedGroup.items[0].itemName).toBe('dashboard.header_item_dashboard');
    });
  });

  describe('mapNavigationMenuToProfileMenu', () => {
    const buttonItem: NavigationMenuItem = {
      itemName: 'Button Item',
      action: { type: 'button', onClick: jest.fn() },
    };
    const linkItem: NavigationMenuItem = {
      itemName: 'Link Item',
      action: { type: 'link', href: 'https://example.com', openInNewTab: true },
    };
    const linkItem2: NavigationMenuItem = {
      itemName: 'Link Item 2',
      action: { type: 'link', href: 'https://example.com', openInNewTab: false },
    };
    const profileMenuButtonItem: NavigationMenuItem = {
      itemName: buttonItem.itemName,
      action: buttonItem.action,
    };
    const profileMenuLinkItem: NavigationMenuItem = {
      itemName: linkItem.itemName,
      action: linkItem.action,
    };
    const profileMenuLinkItem2: NavigationMenuItem = {
      itemName: linkItem2.itemName,
      action: linkItem2.action,
    };

    it('should map an empty array to an empty array', () => {
      expect(mapNavigationMenuToProfileMenu([])).toEqual([]);
    });

    it('should correctly map a single group with a single button item', () => {
      const navigationGroups: NavigationMenuGroup[] = [{ name: 'Group 1', items: [buttonItem] }];

      const result: StudioProfileMenuGroup[] = [{ items: [profileMenuButtonItem] }];
      expect(mapNavigationMenuToProfileMenu(navigationGroups)).toEqual(result);
    });

    it('should correctly map a single group with a single link item', () => {
      const navigationGroups: NavigationMenuGroup[] = [{ name: 'Group 1', items: [linkItem] }];
      const result: StudioProfileMenuGroup[] = [{ items: [profileMenuLinkItem] }];

      expect(mapNavigationMenuToProfileMenu(navigationGroups)).toEqual(result);
    });

    it('should handle multiple groups and items correctly', () => {
      const navigationGroups: NavigationMenuGroup[] = [
        { name: 'Group 1', items: [buttonItem, linkItem] },
        { name: 'Group 2', items: [linkItem2] },
      ];
      const result: StudioProfileMenuGroup[] = [
        { items: [profileMenuButtonItem, profileMenuLinkItem] },
        { items: [profileMenuLinkItem2] },
      ];

      expect(mapNavigationMenuToProfileMenu(navigationGroups)).toEqual(result);
    });

    it('should handle missing optional properties (openInNewTab)', () => {
      const navigationGroups: NavigationMenuGroup[] = [
        {
          name: 'Group 1',
          items: [{ itemName: 'Link Item', action: { type: 'link', href: 'https://example.com' } }],
        },
      ];
      const result: StudioProfileMenuGroup[] = mapNavigationMenuToProfileMenu(navigationGroups);
      expect(result[0].items[0].action).not.toBeUndefined();
    });
  });
});
