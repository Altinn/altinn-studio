import { useTranslation } from 'react-i18next';
import { getIntegerValueErrorKey } from './integerValidation';

export type ValidateIntegerValue = {
  /** The message to show, or an empty string when the value is acceptable. */
  validateIntegerValue: (value: string) => string;
};

/** Translates the rule in `integerValidation`, which is kept free of i18n so it stays testable. */
export const useValidateIntegerValue = (): ValidateIntegerValue => {
  const { t } = useTranslation();

  const validateIntegerValue = (value: string): string => {
    const errorKey = getIntegerValueErrorKey(value);
    return errorKey ? t(errorKey) : '';
  };

  return { validateIntegerValue };
};
