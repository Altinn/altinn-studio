import { FileNameErrorResult } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

export function useInputCodeListNameErrorMessage(): (fileNameError: FileNameErrorResult) => string {
  const { t } = useTranslation();
  const errorMessages: Record<FileNameErrorResult, string> = {
    [FileNameErrorResult.NoRegExMatch]: t('validation_errors.name_invalid'),
    [FileNameErrorResult.FileNameIsEmpty]: t('validation_errors.required'),
    [FileNameErrorResult.FileExists]: t('validation_errors.file_name_occupied'),
  };
  return (fileNameError: FileNameErrorResult): string => errorMessages[fileNameError];
}
