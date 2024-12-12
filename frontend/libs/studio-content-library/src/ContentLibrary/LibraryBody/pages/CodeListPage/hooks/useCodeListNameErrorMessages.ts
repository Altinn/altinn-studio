import { FileNameErrorResult } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

type UseCodeListNameErrorMessagesProps = {
  isNameFromUpload: boolean;
};

export function useCodeListNameErrorMessages({
  isNameFromUpload,
}: UseCodeListNameErrorMessagesProps): Record<FileNameErrorResult, string> {
  const { t } = useTranslation();

  return {
    [FileNameErrorResult.FileNameIsEmpty]: isNameFromUpload
      ? t('validation_errors.upload_file_name_required')
      : t('validation_errors.required'),
    [FileNameErrorResult.FileExists]: isNameFromUpload
      ? t('validation_errors.upload_file_name_occupied')
      : t('validation_errors.file_name_occupied'),
    [FileNameErrorResult.NoRegExMatch]: t('validation_errors.file_name_invalid'),
  };
}
