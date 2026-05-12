import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import {
  movePageToGroup,
  removePageFromGroups,
  updateGroupNames,
  removeEmptyGroups,
  pageGroupDisplayName,
  changeGroupName,
} from './pageGroupUtils';

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

describe('pageGroupUtils', () => {
  describe('removeEmptyGroups', () => {
    it('should not modify groups with no empty groups', () => {
      const groups = [{ order: [{ id: 'test' }] }, { order: [{ id: 'test2' }] }];
      expect(removeEmptyGroups(groups)).toEqual(groups);
    });

    it('should remove empty groups', () => {
      const groups = [{ order: [{ id: 'test' }] }, { order: [] }];
      expect(removeEmptyGroups(groups)).toEqual([{ order: [{ id: 'test' }] }]);
    });
  });

  describe('movePageToGroup', () => {
    it('should move page to new group', () => {
      const groups = [{ order: [{ id: 'test' }] }, { order: [{ id: 'test2' }] }];
      expect(movePageToGroup(groups, 'test2', 0)).toEqual([
        { order: [{ id: 'test' }, { id: 'test2' }] },
        { order: [] },
      ]);
    });

    it('should not automatically update group names', () => {
      const groups = [
        { order: [{ id: 'test' }] },
        { name: 'testname', order: [{ id: 'test2' }, { id: 'test3' }] },
      ];
      expect(movePageToGroup(groups, 'test2', 0)).toEqual([
        { order: [{ id: 'test' }, { id: 'test2' }] },
        { name: 'testname', order: [{ id: 'test3' }] },
      ]);
    });
  });

  describe('removePageFromGroups', () => {
    it('should remove page from all groups', () => {
      const groups = [
        { name: 'testname', order: [{ id: 'test' }, { id: 'test2' }] },
        { order: [{ id: 'test3' }] },
      ];
      expect(removePageFromGroups(groups, 'test2')).toEqual([
        { name: 'testname', order: [{ id: 'test' }] },
        { order: [{ id: 'test3' }] },
      ]);
    });
  });

  describe('updateGroupNames', () => {
    it('should add name to group with more than 1 page', () => {
      const groups = [{ order: [{ id: 'test' }] }, { order: [{ id: 'test2' }, { id: 'test3' }] }];
      expect(updateGroupNames(groups)).toEqual([
        { order: [{ id: 'test' }] },
        { name: 'ux_editor.page_layout_group 1', order: [{ id: 'test2' }, { id: 'test3' }] },
      ]);
    });

    it('should remove name from group with 1 page', () => {
      const groups = [{ order: [{ id: 'test' }] }, { name: 'testname', order: [{ id: 'test2' }] }];
      expect(updateGroupNames(groups)).toEqual([
        { order: [{ id: 'test' }] },
        { order: [{ id: 'test2' }] },
      ]);
    });

    it('should increment group name when adding, to the next available number', () => {
      const groups = [
        { name: 'ux_editor.page_layout_group 1', order: [{ id: 'test' }, { id: 'test2' }] },
        { order: [{ id: 'test3' }, { id: 'test4' }] },
        { name: 'ux_editor.page_layout_group 3', order: [{ id: 'test5' }, { id: 'test6' }] },
      ];
      expect(updateGroupNames(groups)).toEqual([
        { name: 'ux_editor.page_layout_group 1', order: [{ id: 'test' }, { id: 'test2' }] },
        { name: 'ux_editor.page_layout_group 2', order: [{ id: 'test3' }, { id: 'test4' }] },
        { name: 'ux_editor.page_layout_group 3', order: [{ id: 'test5' }, { id: 'test6' }] },
      ]);
    });
  });

  describe('pageGroupDisplayName', () => {
    it('should return the group name if it exists', () => {
      const groupName = pageGroupDisplayName({
        name: 'Group 1',
        order: [{ id: 'page1' }, { id: 'page2' }],
      });
      expect(groupName).toBe('Group 1');
    });

    it('should return name of page if group has only one page', () => {
      const groupName = pageGroupDisplayName({
        order: [{ id: 'page1' }],
      });
      expect(groupName).toBe('page1');
    });
  });

  describe('changeGroupName', () => {
    it('should change the name of the specified group with single group', () => {
      const groups = changeGroupName(
        [{ name: 'Group 1', order: [{ id: 'page1' }, { id: 'page2' }] }],
        0,
        'New Group Name',
      );
      expect(groups).toStrictEqual<GroupModel[]>([
        { name: 'New Group Name', order: [{ id: 'page1' }, { id: 'page2' }] },
      ]);
    });

    it('should change the name of the specified group with multiple groups', () => {
      const groups = changeGroupName(
        [
          { name: 'Group 1', order: [{ id: 'page1' }, { id: 'page2' }] },
          { name: 'Group 2', order: [{ id: 'page3' }, { id: 'page4' }] },
        ],
        1,
        'New Group Name',
      );
      expect(groups).toStrictEqual<GroupModel[]>([
        { name: 'Group 1', order: [{ id: 'page1' }, { id: 'page2' }] },
        { name: 'New Group Name', order: [{ id: 'page3' }, { id: 'page4' }] },
      ]);
    });
  });
});
