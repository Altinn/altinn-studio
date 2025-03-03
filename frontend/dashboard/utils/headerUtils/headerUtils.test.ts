import {
  groupMenuItemsByGroup,
  mapHeaderMenuGroupToNavigationMenu,
  dashboardHeaderMenuItems,
  extractSecondLastRouterParam,
} from './headerUtils';
import { HeaderMenuGroupKey } from 'dashboard/enums/HeaderMenuGroupKey';
import { HeaderMenuItemKey } from 'dashboard/enums/HeaderMenuItemKey';

jest.mock('app-shared/utils/featureToggleUtils');

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

  describe('extractSecondLastRouterParam', () => {
    it('should return the second last part of the pathname', () => {
      const pathname = '/home/user/profile';
      const result = extractSecondLastRouterParam(pathname);
      expect(result).toBe('user');
    });

    it('should handle a single segment pathname', () => {
      const pathname = '/profile';
      const result = extractSecondLastRouterParam(pathname);
      expect(result).toBe('');
    });

    it('should return an empty string for an empty pathname', () => {
      const pathname = '';
      const result = extractSecondLastRouterParam(pathname);
      expect(result).toBe('');
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
      expect(mappedGroup.items[0].name).toBe(HeaderMenuItemKey.AppDashboard);
    });
  });
});
