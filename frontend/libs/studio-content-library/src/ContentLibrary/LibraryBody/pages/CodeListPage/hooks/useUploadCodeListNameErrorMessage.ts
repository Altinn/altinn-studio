import { FileNameErrorResult } from '@studio/pure-functions';
import type { CommonMessageFileNameError } from './useCommonCodeListNameErrorMessages';
import { useCommonCodeListNameErrorMessages } from './useCommonCodeListNameErrorMessages';
import { useTranslation } from 'react-i18next';

export function useUploadCodeListNameErrorMessage(): (
  fileNameError: FileNameErrorResult,
) => string {
  const { t } = useTranslation();
  const commonErrorMessage: CommonMessageFileNameError = useCommonCodeListNameErrorMessages();
  const errorMessages: Record<FileNameErrorResult, string> = {
    ...commonErrorMessage,
    [FileNameErrorResult.FileNameIsEmpty]: t('validation_errors.upload_file_name_required'),
    [FileNameErrorResult.FileExists]: t('validation_errors.upload_file_name_occupied'),
  };
  return (fileNameError: FileNameErrorResult): string => errorMessages[fileNameError];
}