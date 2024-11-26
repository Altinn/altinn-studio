import { FileNameValidationResult } from '@studio/pure-functions';
import { useInputCodeListNameErrorMessage } from './useInputCodeListNameErrorMessage';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useInputCodeListNameErrorMessage', () => {
  it('returns correct errorMessage for empty uploaded file name', () => {
    const FileNameIsEmptyValidationResult = FileNameValidationResult.FileNameIsEmpty;
    const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();
    const errorMessage = getInvalidInputFileNameErrorMessage(FileNameIsEmptyValidationResult);
    expect(errorMessage).toBe(textMock('validation_errors.required'));
  });

  it('returns correct errorMessage for existing uploaded file name', () => {
    const FileExistsValidationResult = FileNameValidationResult.FileExists;
    const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();
    const errorMessage = getInvalidInputFileNameErrorMessage(FileExistsValidationResult);
    expect(errorMessage).toBe(textMock('validation_errors.file_name_occupied'));
  });

  it('returns no errorMessage when result is valid', () => {
    const ValidValidationResult = FileNameValidationResult.Valid;
    const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();
    const errorMessage = getInvalidInputFileNameErrorMessage(ValidValidationResult);
    expect(errorMessage).toBeUndefined();
  });
});
