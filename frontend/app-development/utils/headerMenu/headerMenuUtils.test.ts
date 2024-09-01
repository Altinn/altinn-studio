import { RepositoryType } from 'app-shared/types/global';
import {
  getFilteredTopBarMenu,
  getTopBarMenuItems,
  groupMenuItemsByGroup,
  mapHeaderMenuGroupToNavigationMenu,
  topBarMenuItem,
} from './headerMenuUtils';
import { type HeaderMenuItem } from 'app-development/types/HeaderMenu/HeaderMenuItem';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { DatabaseIcon } from '@studio/icons';
import { HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';
import { typedLocalStorage } from '@studio/components';

describe('headerMenuUtils', () => {
  describe('getFilteredTopBarMenu', () => {
    it('should return all items when provided repository type is "App" which is not hidden behind feature-flags', () => {
      const menuLength = topBarMenuItem.filter((menuItem) => !menuItem.featureFlagName).length;
      expect(getFilteredTopBarMenu(RepositoryType.App)).toHaveLength(menuLength);
    });

    it('Should only return the data model menu item when the provided repo type is "DataModels"', () => {
      const expected: HeaderMenuItem[] = [
        {
          key: HeaderMenuItemKey.DataModel,
          link: RoutePaths.DataModel,
          icon: DatabaseIcon,
          repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
          group: HeaderMenuGroupKey.Tools,
        },
      ];

      expect(getFilteredTopBarMenu(RepositoryType.DataModels)).toEqual(expected);
    });

    it('should return empty list when provided repo type is "Unknown"', () => {
      const expected: HeaderMenuItem[] = [];

      expect(getFilteredTopBarMenu(RepositoryType.Unknown)).toEqual(expected);
    });

    it('should return menu items including items hidden behind feature flag, if the flag i activated', () => {
      typedLocalStorage.setItem('featureFlags', []); // Add the flags in the array when you want to test it
      expect(getFilteredTopBarMenu(RepositoryType.App)).toHaveLength(topBarMenuItem.length);
    });
  });

  describe('getTopBarMenuItems', () => {
    it('should filter out Deploy item when repoOwnerIsOrg is false', () => {
      const filteredItems = getTopBarMenuItems(RepositoryType.App, false);
      expect(filteredItems.some((item) => item.key === HeaderMenuItemKey.Deploy)).toBe(false);
    });

    it('should include Deploy item when repoOwnerIsOrg is true and repositoryType is not DataModels', () => {
      const filteredItems = getTopBarMenuItems(RepositoryType.App, true);
      expect(filteredItems.some((item) => item.key === HeaderMenuItemKey.Deploy)).toBe(true);
    });

    it('should filter out Deploy item when repositoryType is DataModels', () => {
      const filteredItems = getTopBarMenuItems(RepositoryType.DataModels, true);
      expect(filteredItems.some((item) => item.key === HeaderMenuItemKey.Deploy)).toBe(false);
    });
  });

  describe('groupMenuItemsByGroup', () => {
    it('should group items by their group key', () => {
      const groupedItems = groupMenuItemsByGroup(topBarMenuItem);
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
        menuItems: [topBarMenuItem.find((item) => item.key === HeaderMenuItemKey.Create)!],
      };
      const mappedGroup = mapHeaderMenuGroupToNavigationMenu(group);
      expect(mappedGroup.name).toBe(HeaderMenuGroupKey.Tools);
      expect(mappedGroup.items.length).toBe(1);
      expect(mappedGroup.items[0].name).toBe(HeaderMenuItemKey.Create);
    });
  });
});
