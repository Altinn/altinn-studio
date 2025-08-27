import { FileNameErrorResult } from 'libs/studio-pure-functions/src';
import { useTranslation } from 'react-i18next';

export function useUploadCodeListNameErrorMessage(): (
  fileNameError: FileNameErrorResult,
) => string {
  const { t } = useTranslation();
  const errorMessages: Record<FileNameErrorResult, string> = {
    [FileNameErrorResult.NoRegExMatch]: t('validation_errors.file_name_invalid'),
    [FileNameErrorResult.FileNameIsEmpty]: t('validation_errors.upload_file_name_required'),
    [FileNameErrorResult.FileExists]: t('validation_errors.upload_file_name_occupied'),
  };
  return (fileNameError: FileNameErrorResult): string => errorMessages[fileNameError];
}
