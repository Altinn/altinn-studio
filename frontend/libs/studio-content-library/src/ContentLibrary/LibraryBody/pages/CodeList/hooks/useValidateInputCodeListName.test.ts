import { FileNameValidationResult } from '@studio/pure-functions';
import { useValidateInputCodeListName } from './useValidateInputCodeListName';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useValidateInputCodeListName', () => {
  describe('getInvalidInputFileNameErrorMessage', () => {
    it('returns correct errorMessage for empty uploaded file name', () => {
      const FileNameIsEmptyValidationResult = FileNameValidationResult.FileNameIsEmpty;
      const { getInvalidInputFileNameErrorMessage } = useValidateInputCodeListName();
      const errorMessage = getInvalidInputFileNameErrorMessage(FileNameIsEmptyValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.required'));
    });

    it('returns correct errorMessage for existing uploaded file name', () => {
      const FileExistsValidationResult = FileNameValidationResult.FileExists;
      const { getInvalidInputFileNameErrorMessage } = useValidateInputCodeListName();
      const errorMessage = getInvalidInputFileNameErrorMessage(FileExistsValidationResult);
      expect(errorMessage).toBe(textMock('validation_errors.file_name_occupied'));
    });

    it('returns no errorMessage when result is valid', () => {
      const ValidValidationResult = FileNameValidationResult.Valid;
      const { getInvalidInputFileNameErrorMessage } = useValidateInputCodeListName();
      const errorMessage = getInvalidInputFileNameErrorMessage(ValidValidationResult);
      expect(errorMessage).toBeUndefined();
    });
  });
});
