import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import type { FileNameError } from '../types/FileNameError';

export const useValidationAlert = () => {
  const { t } = useTranslation();

  return useCallback(
    (error: FileNameError): void => {
      if (error === 'invalidFileName') {
        alert(t('app_data_modelling.upload_xsd_invalid_name_error'));
      }
    },
    [t],
  );
};
