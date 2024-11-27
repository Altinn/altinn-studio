import { FileNameErrorResult } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

export function useInputCodeListNameErrorMessage(): (fileNameError: FileNameErrorResult) => string {
  const { t } = useTranslation();

  type FileNameInputErrorResult = Exclude<FileNameErrorResult, FileNameErrorResult.NoRegExMatch>;

  const errorMessages: Record<FileNameInputErrorResult, string> = {
    [FileNameErrorResult.FileNameIsEmpty]: t('validation_errors.required'),
    [FileNameErrorResult.FileExists]: t('validation_errors.file_name_occupied'),
  };

  return (fileNameError: FileNameErrorResult): string => errorMessages[fileNameError];
}
