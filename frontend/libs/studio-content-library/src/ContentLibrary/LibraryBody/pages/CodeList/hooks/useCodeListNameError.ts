import { useTranslation } from 'react-i18next';
import { FileNameErrorResult } from '@studio/pure-functions';

export const useCodeListNameError = () => {
  const { t } = useTranslation();

  const errorMessages: Record<FileNameErrorResult, string> = {
    [FileNameErrorResult.FileNameIsEmpty]: t('validation_errors.upload_file_name_required'),
    [FileNameErrorResult.FileExists]: t('validation_errors.upload_file_name_occupied'),
    [FileNameErrorResult.NoRegExMatch]: t('validation_errors.file_name_invalid'),
  };

  return errorMessages;
};
