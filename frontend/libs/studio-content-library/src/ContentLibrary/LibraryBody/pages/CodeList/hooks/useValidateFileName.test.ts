import { FileNameValidationResult } from '@studio/pure-functions';
import { useValidateFileName } from './useValidateFileName';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useValidateFileName', () => {
  describe('getInvalidUploadFileNameErrorMessage', () => {
    it('returns correct errorMessage for empty uploaded file name', () => {
      const FileNameIsEmptyValidationResult = FileNameValidationResult.FileNameIsEmpty;
      const { getInvalidUploadFileNameErrorMessage } = useValidateFileName();
      const errorMessage = getInvalidUploadFileNameErrorMessage(FileNameIsEmptyValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.upload_file_name_required'));
    });

    it('returns correct errorMessage for uploaded file name that not matches a given regEx', () => {
      const NoRegExMatchValidationResult = FileNameValidationResult.NoRegExMatch;
      const { getInvalidUploadFileNameErrorMessage } = useValidateFileName();
      const errorMessage = getInvalidUploadFileNameErrorMessage(NoRegExMatchValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.file_name_invalid'));
    });

    it('returns correct errorMessage for existing uploaded file name', () => {
      const FileExistsValidationResult = FileNameValidationResult.FileExists;
      const { getInvalidUploadFileNameErrorMessage } = useValidateFileName();
      const errorMessage = getInvalidUploadFileNameErrorMessage(FileExistsValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.upload_file_name_occupied'));
    });
  });

  describe('getInvalidInputFileNameErrorMessage', () => {
    it('returns correct errorMessage for empty uploaded file name', () => {
      const FileNameIsEmptyValidationResult = FileNameValidationResult.FileNameIsEmpty;
      const { getInvalidInputFileNameErrorMessage } = useValidateFileName();
      const errorMessage = getInvalidInputFileNameErrorMessage(FileNameIsEmptyValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.required'));
    });

    it('returns correct errorMessage for uploaded file name that not matches a given regEx', () => {
      const NoRegExMatchValidationResult = FileNameValidationResult.NoRegExMatch;
      const { getInvalidInputFileNameErrorMessage } = useValidateFileName();
      const errorMessage = getInvalidInputFileNameErrorMessage(NoRegExMatchValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.file_name_invalid'));
    });

    it('returns correct errorMessage for existing uploaded file name', () => {
      const FileExistsValidationResult = FileNameValidationResult.FileExists;
      const { getInvalidInputFileNameErrorMessage } = useValidateFileName();
      const errorMessage = getInvalidInputFileNameErrorMessage(FileExistsValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.file_name_occupied'));
    });
  });
});
