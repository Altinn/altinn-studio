import { FileNameValidationResult } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

export function useValidateFileName() {
  const { t } = useTranslation();

  type FileNameValidationErrorResult = Exclude<
    FileNameValidationResult,
    FileNameValidationResult.Valid
  >;

  const defaultErrorMessages: Record<FileNameValidationErrorResult, string> = {
    [FileNameValidationResult.FileNameIsEmpty]: t('validation_errors.required'),
    [FileNameValidationResult.NoRegExMatch]: t('validation_errors.file_name_invalid'),
    [FileNameValidationResult.FileExists]: t('validation_errors.file_name_occupied'),
  };

  const getInvalidUploadFileNameErrorMessage = (fileNameError: FileNameValidationResult) => {
    defaultErrorMessages[FileNameValidationResult.FileNameIsEmpty] = t(
      'validation_errors.upload_file_name_required',
    );
    defaultErrorMessages[FileNameValidationResult.FileExists] = t(
      'validation_errors.upload_file_name_occupied',
    );
    return defaultErrorMessages[fileNameError];
  };

  const getInvalidInputFileNameErrorMessage = (fileNameError: FileNameValidationResult) => {
    return defaultErrorMessages[fileNameError];
  };

  return { getInvalidUploadFileNameErrorMessage, getInvalidInputFileNameErrorMessage };
}
