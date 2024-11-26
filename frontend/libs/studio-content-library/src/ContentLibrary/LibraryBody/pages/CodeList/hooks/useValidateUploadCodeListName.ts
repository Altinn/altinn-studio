import { FileNameValidationResult } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

export function useValidateUploadCodeListName() {
  const { t } = useTranslation();

  type FileNameValidationErrorResult = Exclude<
    FileNameValidationResult,
    FileNameValidationResult.Valid | FileNameValidationResult.NoRegExMatch
  >;

  const errorMessages: Record<FileNameValidationErrorResult, string> = {
    [FileNameValidationResult.FileNameIsEmpty]: t('validation_errors.upload_file_name_required'),
    [FileNameValidationResult.FileExists]: t('validation_errors.upload_file_name_occupied'),
  };

  return (fileNameError: FileNameValidationResult) => errorMessages[fileNameError];
}
