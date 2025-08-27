import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { FileNameErrorResult } from 'libs/studio-pure-functions/src';

export const useValidationAlert = () => {
  const { t } = useTranslation();

  return useCallback(
    (error: FileNameErrorResult): void => {
      if (error === FileNameErrorResult.NoRegExMatch) {
        alert(t('app_data_modelling.upload_xsd_invalid_name_error'));
      }
    },
    [t],
  );
};
