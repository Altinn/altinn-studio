import { useState } from 'react';
import { Validation, validate as doValidate } from '../../utils/validationUtils';

interface UseValidationResult {
  validationError: string | undefined;
  validate: (valueToValidate: string) => UseValidationResult['validationError'];
}
export const useValidation = (validation: Validation): UseValidationResult => {
  const [validationError, setValidationState] =
    useState<UseValidationResult['validationError']>(undefined);

  const validate = (valueToValidate: string): UseValidationResult['validationError'] => {
    const { error } = doValidate(validation, valueToValidate);
    setValidationState(error);
    return error;
  };

  return {
    validate,
    validationError,
  };
};
