import {
  groupMenuItemsByGroup,
  mapHeaderMenuGroupToNavigationMenu,
  topBarMenuItems,
} from './headerMenuUtils';
import { HeaderMenuItemKey } from 'app-development/enums/HeaderMenuItemKey';
import { HeaderMenuGroupKey } from 'app-development/enums/HeaderMenuGroupKey';

describe('headerMenuUtils', () => {
  describe('groupMenuItemsByGroup', () => {
    it('groups items by their group key', () => {
      const groupedItems = groupMenuItemsByGroup(topBarMenuItems);
      expect(groupedItems.length).toBeGreaterThan(0);

      groupedItems.forEach((group) => {
        group.menuItems.forEach((item) => {
          expect(item.group).toBe(group.groupName);
        });
      });
    });
  });

  describe('mapHeaderMenuGroupToNavigationMenu', () => {
    it('maps a header menu group to a navigation menu group', () => {
      const group = {
        groupName: HeaderMenuGroupKey.Tools,
        menuItems: [topBarMenuItems.find((item) => item.key === HeaderMenuItemKey.Create)!],
      };
      const mappedGroup = mapHeaderMenuGroupToNavigationMenu(group);
      expect(mappedGroup.name).toBe(HeaderMenuGroupKey.Tools);
      expect(mappedGroup.items.length).toBe(1);
      expect(mappedGroup.items[0].name).toBe(HeaderMenuItemKey.Create);
    });
  });
});
