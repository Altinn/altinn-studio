import type { GroupModel } from 'app-shared/types/api/dto/PageModel';
import {
  getPageNameErrorKey,
  getUpdatedGroupsExcludingPage,
  pageNameExists,
} from './designViewUtils';

const mockNewNameCandidateCorrect: string = 'newPage';
const mockNewNameCandidateExists: string = 'page2';
const mockNewNameCandidateEmpty: string = '';
const mockNewNameCandidateTooLong: string = 'ThisStringIsTooooooooooooooLong';
const mockNewNameCandidateInvalid: string = 'Page????';
const mockNewNameCandidateWithPeriod: string = 'Page.2';

const mockOldName: string = 'oldName';
const mockLayoutNames: string[] = [mockOldName, mockNewNameCandidateExists, 'page3'];

describe('designViewUtils', () => {
  describe('pageNameExists', () => {
    it('returns true if the page name exists', () => {
      const exists = pageNameExists({
        candidateName: mockNewNameCandidateExists,
        oldName: mockOldName,
        layoutNames: mockLayoutNames,
      });
      expect(exists).toBeTruthy();
    });

    it('returns false if the page name does not exists', () => {
      const exists = pageNameExists({
        candidateName: mockNewNameCandidateCorrect,
        oldName: mockOldName,
        layoutNames: mockLayoutNames,
      });
      expect(exists).toBeFalsy();
    });

    it('returns false if the page name is the same as the old name', () => {
      const exists = pageNameExists({
        candidateName: mockOldName,
        oldName: mockOldName,
        layoutNames: mockLayoutNames,
      });
      expect(exists).toBeFalsy();
    });

    it('returns false if the page name is the same as the old name but in different case', () => {
      const exists = pageNameExists({
        candidateName: mockOldName.toUpperCase(),
        oldName: mockOldName,
        layoutNames: mockLayoutNames,
      });
      expect(exists).toBeFalsy();
    });
  });

  describe('getPageNameErrorKey', () => {
    it('returns not unique error key when page name is not unique', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateExists,
        mockOldName,
        mockLayoutNames,
      );
      expect(nameErrorkey).toEqual('ux_editor.pages_error_unique');
    });

    it('returns empty error key when name is empty', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateEmpty,
        mockOldName,
        mockLayoutNames,
      );
      expect(nameErrorkey).toEqual('ux_editor.pages_error_empty');
    });

    it('returns name invalid error key when name is too long', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateTooLong,
        mockOldName,
        mockLayoutNames,
      );
      expect(nameErrorkey).toEqual('validation_errors.name_invalid');
    });

    it('returns name invalid error key when name contains period (.)', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateWithPeriod,
        mockOldName,
        mockLayoutNames,
      );
      expect(nameErrorkey).toEqual('validation_errors.name_invalid');
    });

    it('returns name invalid error key when name contains invalid characters', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateInvalid,
        mockOldName,
        mockLayoutNames,
      );
      expect(nameErrorkey).toEqual('validation_errors.name_invalid');
    });

    it('returns null when there are no errors', () => {
      const nameError = getPageNameErrorKey(
        mockNewNameCandidateCorrect,
        mockOldName,
        mockLayoutNames,
      );
      expect(nameError).toEqual(null);
    });
  });

  describe('getUpdatedGroupsExcludingPage', () => {
    const page = (id: string) => ({ id });
    const group = (pages: string[], name?: string) => ({
      order: pages.map(page),
      ...(name ? { name } : {}),
    });

    it('should remove the page from the specified group', () => {
      const groups = [group(['page1', 'page2'], 'Group 1'), group(['page3'])];
      const updatedGroups = getUpdatedGroupsExcludingPage({
        pageId: 'page1',
        groups,
        groupIndex: 0,
      });

      expect(updatedGroups).toEqual([group(['page2']), group(['page3'])]);
    });

    it('should remove the group if it becomes empty', () => {
      const groups = [group(['page1', 'page2'], 'Group 1'), group(['page3'])];
      const updatedGroups = getUpdatedGroupsExcludingPage({
        pageId: 'page3',
        groups,
        groupIndex: 1,
      });

      expect(updatedGroups).toEqual([group(['page1', 'page2'], 'Group 1')]);
    });
    it('should keep the name of the group if it has more than one page left', () => {
      const groups = [group(['page1', 'page2', 'page3'], 'Group 1')];
      const updatedGroups = getUpdatedGroupsExcludingPage({
        pageId: 'page1',
        groups,
        groupIndex: 0,
      });

      expect(updatedGroups).toEqual([group(['page2', 'page3'], 'Group 1')]);
    });
  });
});
