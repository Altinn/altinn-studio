import { useCallback } from 'react';

import { ValidationMask } from '..';

import { FormStore } from 'src/features/form/FormContext';
import { useWaitForValidation } from 'src/features/validation/validationContext';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';

/**
 * Checks for any validation errors before submitting the form.
 * returns true if there are any errors, in that case submitting should be prevented.
 * If includeNonIncrementalValidations is false, then we try to submit if there are only nonIncremental validations,
 * these are not updated on PATCH, but will be validated on process/next,
 * so to prevent the user having to refresh the page we should ignore them when clicking submit.
 * We should however show them after we get the results of process/next.
 */
export function useOnFormSubmitValidation() {
  const validate = useWaitForValidation();
  const setFormValidationMask = FormStore.validation.useSetFormValidationMask();
  const getNodesWithErrors = FormStore.nodes.useGetNodesWithErrors();

  const callback = useOurEffectEvent((includeNonIncrementalValidations: boolean): boolean => {
    /*
     * Check if there are any frontend validation errors, and if so, show them now and block submit
     */
    const validations = getNodesWithErrors(ValidationMask.All, 'error', false);
    if (
      includeNonIncrementalValidations
        ? validations.length > 0
        : validations.filter((v) => !v.noIncrementalUpdates).length > 0
    ) {
      setFormValidationMask(ValidationMask.All);
      return true;
    }

    return false;
  });

  return useCallback(
    async (includeNonIncrementalValidations = false) => {
      await validate();
      return callback(includeNonIncrementalValidations);
    },
    [callback, validate],
  );
}
