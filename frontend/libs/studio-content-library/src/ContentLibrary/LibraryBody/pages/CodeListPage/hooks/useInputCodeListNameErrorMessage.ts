import { FileNameErrorResult } from '@studio/pure-functions';
import type { CommonMessageFileNameError } from './useCommonCodeListNameErrorMessages';
import { useCommonCodeListNameErrorMessages } from './useCommonCodeListNameErrorMessages';
import { useTranslation } from 'react-i18next';

export function useInputCodeListNameErrorMessage(): (fileNameError: FileNameErrorResult) => string {
  const { t } = useTranslation();
  const commonErrorMessage: CommonMessageFileNameError = useCommonCodeListNameErrorMessages();
  const errorMessages: Record<FileNameErrorResult, string> = {
    ...commonErrorMessage,
    [FileNameErrorResult.FileNameIsEmpty]: t('validation_errors.required'),
    [FileNameErrorResult.FileExists]: t('validation_errors.file_name_occupied'),
  };
  return (fileNameError: FileNameErrorResult): string => errorMessages[fileNameError];
}
