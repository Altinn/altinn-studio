import { useTranslation } from 'react-i18next';
import { getRequiredSubformPdfValueErrorKey } from './subformPdfConfigUtils';

type UseValidateSubformPdfValueResult = {
  validateRequiredSubformPdfValue: (value: string) => string;
};

export const useValidateSubformPdfValue = (): UseValidateSubformPdfValueResult => {
  const { t } = useTranslation();

  const validateRequiredSubformPdfValue = (value: string): string => {
    const errorKey = getRequiredSubformPdfValueErrorKey(value);
    return errorKey ? t(errorKey) : '';
  };

  return { validateRequiredSubformPdfValue };
};
