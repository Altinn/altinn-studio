import { FileNameErrorResult } from '@studio/pure-functions';
import { useUploadCodeListNameErrorMessage } from './useUploadCodeListNameErrorMessage';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useUploadCodeListNameErrorMessage', () => {
  it('returns correct errorMessage for empty uploaded file name', () => {
    const fileNameIsEmptyErrorResult = FileNameErrorResult.FileNameIsEmpty;
    const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();
    const errorMessage = getInvalidUploadFileNameErrorMessage(fileNameIsEmptyErrorResult);
    expect(errorMessage).toBe(textMock('validation_errors.upload_file_name_required'));
  });

  it('returns correct errorMessage for existing uploaded file name', () => {
    const fileExistsErrorResult = FileNameErrorResult.FileExists;
    const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();
    const errorMessage = getInvalidUploadFileNameErrorMessage(fileExistsErrorResult);
    expect(errorMessage).toBe(textMock('validation_errors.upload_file_name_occupied'));
  });

  it('returns no errorMessage when fileNameError is null', () => {
    const nullErrorResult = null;
    const getInvalidUploadFileNameErrorMessage = useUploadCodeListNameErrorMessage();
    const errorMessage = getInvalidUploadFileNameErrorMessage(nullErrorResult);
    expect(errorMessage).toBeUndefined();
  });
});
