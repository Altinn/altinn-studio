import { FileNameValidationResult } from '@studio/pure-functions';
import { useUploadCodeListNameErrorMessage } from './useUploadCodeListNameErrorMessage';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useUploadCodeListNameErrorMessage', () => {
  it('returns correct errorMessage for empty uploaded file name', () => {
    const FileNameIsEmptyValidationResult = FileNameValidationResult.FileNameIsEmpty;
    const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();
    const errorMessage = getInvalidUploadFileNameErrorMessage(FileNameIsEmptyValidationResult);
    expect(errorMessage).toBe(textMock('validation_errors.upload_file_name_required'));
  });

  it('returns correct errorMessage for existing uploaded file name', () => {
    const FileExistsValidationResult = FileNameValidationResult.FileExists;
    const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();
    const errorMessage = getInvalidUploadFileNameErrorMessage(FileExistsValidationResult);
    expect(errorMessage).toBe(textMock('validation_errors.upload_file_name_occupied'));
  });

  it('returns no errorMessage when result is valid', () => {
    const ValidValidationResult = FileNameValidationResult.Valid;
    const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();
    const errorMessage = getInvalidUploadFileNameErrorMessage(ValidValidationResult);
    expect(errorMessage).toBeUndefined();
  });
});
