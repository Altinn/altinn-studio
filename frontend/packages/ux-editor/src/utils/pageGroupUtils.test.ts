import { PageGroupUtils } from './pageGroupUtils';

jest.mock('i18next', () => ({
  t: (key: string) => key,
}));

describe('pageGroupUtils', () => {
  describe('removeEmptyGroups', () => {
    it('should not modify groups with no empty groups', () => {
      const groups = [{ order: [{ id: 'test' }] }, { order: [{ id: 'test2' }] }];
      expect(new PageGroupUtils(groups).removeEmptyGroups().groups).toEqual(groups);
    });
    it('should remove empty groups', () => {
      const groups = [{ order: [{ id: 'test' }] }, { order: [] }];
      expect(new PageGroupUtils(groups).removeEmptyGroups().groups).toEqual([
        { order: [{ id: 'test' }] },
      ]);
    });
  });

  describe('movePageToGroup', () => {
    it('should move page to new group', () => {
      const groups = [{ order: [{ id: 'test' }] }, { order: [{ id: 'test2' }] }];
      expect(new PageGroupUtils(groups).movePageToGroup('test2', 0).groups).toEqual([
        { order: [{ id: 'test' }, { id: 'test2' }] },
        { order: [] },
      ]);
    });

    it('should remove name if group moved from has 2 pages', () => {
      const groups = [
        { order: [{ id: 'test' }] },
        { name: 'testname', order: [{ id: 'test2' }, { id: 'test3' }] },
      ];
      expect(new PageGroupUtils(groups).movePageToGroup('test2', 0).groups).toEqual([
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
      expect(new PageGroupUtils(groups).removePageFromGroups('test2').groups).toEqual([
        { name: 'testname', order: [{ id: 'test' }] },
        { order: [{ id: 'test3' }] },
      ]);
    });
  });

  describe('updateGroupNames', () => {
    it('should add name to group with more than 1 page', () => {
      const groups = [{ order: [{ id: 'test' }] }, { order: [{ id: 'test2' }, { id: 'test3' }] }];
      expect(new PageGroupUtils(groups).updateGroupNames().groups).toEqual([
        { order: [{ id: 'test' }] },
        { name: 'ux_editor.page_layout_group 1', order: [{ id: 'test2' }, { id: 'test3' }] },
      ]);
    });

    it('should remove name from group with 1 page', () => {
      const groups = [{ order: [{ id: 'test' }] }, { name: 'testname', order: [{ id: 'test2' }] }];
      expect(new PageGroupUtils(groups).updateGroupNames().groups).toEqual([
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
      expect(new PageGroupUtils(groups).updateGroupNames().groups).toEqual([
        { name: 'ux_editor.page_layout_group 1', order: [{ id: 'test' }, { id: 'test2' }] },
        { name: 'ux_editor.page_layout_group 2', order: [{ id: 'test3' }, { id: 'test4' }] },
        { name: 'ux_editor.page_layout_group 3', order: [{ id: 'test5' }, { id: 'test6' }] },
      ]);
    });
  });
});
