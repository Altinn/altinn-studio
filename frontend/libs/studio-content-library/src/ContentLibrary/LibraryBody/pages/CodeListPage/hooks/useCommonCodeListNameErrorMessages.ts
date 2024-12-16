import { FileNameErrorResult } from '@studio/pure-functions';
import { useTranslation } from 'react-i18next';

export type CommonMessageFileNameError = Record<FileNameErrorResult.NoRegExMatch, string>;

export function useCommonCodeListNameErrorMessages(): CommonMessageFileNameError {
  const { t } = useTranslation();

  return {
    [FileNameErrorResult.NoRegExMatch]: t('validation_errors.file_name_invalid'),
  };
}
