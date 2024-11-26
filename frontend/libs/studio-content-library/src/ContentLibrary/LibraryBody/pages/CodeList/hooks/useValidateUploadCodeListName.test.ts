import { FileNameValidationResult } from '@studio/pure-functions';
import { useValidateUploadCodeListName } from './useValidateUploadCodeListName';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useValidateUploadCodeListName', () => {
  describe('getInvalidUploadFileNameErrorMessage', () => {
    it('returns correct errorMessage for empty uploaded file name', () => {
      const FileNameIsEmptyValidationResult = FileNameValidationResult.FileNameIsEmpty;
      const { getInvalidUploadFileNameErrorMessage } = useValidateUploadCodeListName();
      const errorMessage = getInvalidUploadFileNameErrorMessage(FileNameIsEmptyValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.upload_file_name_required'));
    });

    it('returns correct errorMessage for existing uploaded file name', () => {
      const FileExistsValidationResult = FileNameValidationResult.FileExists;
      const { getInvalidUploadFileNameErrorMessage } = useValidateUploadCodeListName();
      const errorMessage = getInvalidUploadFileNameErrorMessage(FileExistsValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.upload_file_name_occupied'));
    });

    it('returns no errorMessage when result is valid', () => {
      const ValidValidationResult = FileNameValidationResult.Valid;
      const { getInvalidUploadFileNameErrorMessage } = useValidateUploadCodeListName();
      const errorMessage = getInvalidUploadFileNameErrorMessage(ValidValidationResult);
      expect(errorMessage).toBeUndefined();
    });
  });
});
