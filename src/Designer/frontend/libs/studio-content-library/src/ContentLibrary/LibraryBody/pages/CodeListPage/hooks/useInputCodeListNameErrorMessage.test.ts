import { FileNameErrorResult } from 'libs/studio-pure-functions/src';
import { useInputCodeListNameErrorMessage } from './useInputCodeListNameErrorMessage';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('useInputCodeListNameErrorMessage', () => {
  it('returns correct errorMessage for empty uploaded file name', () => {
    const fileNameIsEmptyErrorResult = FileNameErrorResult.FileNameIsEmpty;
    const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();
    const errorMessage = getInvalidInputFileNameErrorMessage(fileNameIsEmptyErrorResult);
    expect(errorMessage).toBe(textMock('validation_errors.required'));
  });

  it('returns correct errorMessage for existing uploaded file name', () => {
    const fileExistsErrorResult = FileNameErrorResult.FileExists;
    const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();
    const errorMessage = getInvalidInputFileNameErrorMessage(fileExistsErrorResult);
    expect(errorMessage).toBe(textMock('validation_errors.file_name_occupied'));
  });

  it('returns no errorMessage when fileNameError is null', () => {
    const nullErrorResult = null;
    const getInvalidInputFileNameErrorMessage = useInputCodeListNameErrorMessage();
    const errorMessage = getInvalidInputFileNameErrorMessage(nullErrorResult);
    expect(errorMessage).toBeUndefined();
  });
});
