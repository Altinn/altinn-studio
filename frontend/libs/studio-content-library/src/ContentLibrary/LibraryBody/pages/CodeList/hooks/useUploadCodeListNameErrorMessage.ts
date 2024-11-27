import { FileNameErrorResult } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

export function useUploadCodeListNameErrorMessage() {
  const { t } = useTranslation();

  type FileNameUploadErrorResult = Exclude<FileNameErrorResult, FileNameErrorResult.NoRegExMatch>;

  const errorMessages: Record<FileNameUploadErrorResult, string> = {
    [FileNameErrorResult.FileNameIsEmpty]: t('validation_errors.upload_file_name_required'),
    [FileNameErrorResult.FileExists]: t('validation_errors.upload_file_name_occupied'),
  };

  return (fileNameError: FileNameErrorResult): string => errorMessages[fileNameError];
}
