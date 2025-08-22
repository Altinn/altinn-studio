import { getPageNameErrorKey, pageNameExists } from './designViewUtils';

const mockNewNameCandidateCorrect: string = 'newPage';
const mockNewNameCandidateExists: string = 'page2';
const mockNewNameCandidateEmpty: string = '';
const mockNewNameCandidateTooLong: string = 'ThisStringIsTooooooooooooooLong';
const mockNewNameCandidateInvalid: string = 'Page????';

const mockOldName: string = 'oldName';
const mockLayoutOrder: string[] = [mockOldName, mockNewNameCandidateExists, 'page3'];

describe('designViewUtils', () => {
  describe('pageNameExists', () => {
    it('returns true if the page name exists', () => {
      const exists = pageNameExists(mockOldName, mockLayoutOrder);
      expect(exists).toBeTruthy();
    });

    it('returns false if the page name does not exists', () => {
      const exists = pageNameExists(mockNewNameCandidateCorrect, mockLayoutOrder);
      expect(exists).toBeFalsy();
    });
  });

  describe('getPageNameErrorKey', () => {
    it('returns not unique error key when page name is not unique', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateExists,
        mockOldName,
        mockLayoutOrder,
      );
      expect(nameErrorkey).toEqual('ux_editor.pages_error_unique');
    });

    it('returns empty error key when name is empty', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateEmpty,
        mockOldName,
        mockLayoutOrder,
      );
      expect(nameErrorkey).toEqual('ux_editor.pages_error_empty');
    });

    it('returns name invalid error key when name is too long', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateTooLong,
        mockOldName,
        mockLayoutOrder,
      );
      expect(nameErrorkey).toEqual('validation_errors.name_invalid');
    });

    it('returns name invalid error key when name contains invalid characters', () => {
      const nameErrorkey = getPageNameErrorKey(
        mockNewNameCandidateInvalid,
        mockOldName,
        mockLayoutOrder,
      );
      expect(nameErrorkey).toEqual('validation_errors.name_invalid');
    });

    it('returns null when oldname and new name is the same', () => {
      const nameError = getPageNameErrorKey(mockOldName, mockOldName, mockLayoutOrder);
      expect(nameError).toEqual(null);
    });

    it('returns null when there are no errors', () => {
      const nameError = getPageNameErrorKey(
        mockNewNameCandidateCorrect,
        mockOldName,
        mockLayoutOrder,
      );
      expect(nameError).toEqual(null);
    });
  });
});
