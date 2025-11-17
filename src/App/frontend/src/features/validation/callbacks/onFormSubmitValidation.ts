import { useCallback } from 'react';

import { ValidationMask } from '..';

import { ContextNotProvided } from 'src/core/contexts/context';
import { Validation } from 'src/features/validation/validationContext';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import { NodesInternal } from 'src/utils/layout/NodesContext';

/**
 * Checks for any validation errors before submitting the form.
 * returns true if there are any errors, in that case submitting should be prevented.
 * If includeNonIncrementalValidations is false, then we try to submit if there are only nonIncremental validations,
 * these are not updated on PATCH, but will be validated on process/next,
 * so to prevent the user having to refresh the page we should ignore them when clicking submit.
 * We should however show them after we get the results of process/next.
 */
export function useOnFormSubmitValidation() {
  const validation = Validation.useLaxRef();
  const setNodeVisibility = NodesInternal.useLaxSetNodeVisibility();
  const getNodesWithErrors = NodesInternal.useGetNodesWithErrors();

  const callback = useOurEffectEvent((includeNonIncrementalValidations: boolean): boolean => {
    if (validation.current === ContextNotProvided || setNodeVisibility === ContextNotProvided) {
      // If the validation context or nodes context is not provided, we cannot validate
      return false;
    }

    /*
     * Check if there are any frontend validation errors, and if so, show them now and block submit
     */
    const nodesWithFrontendErrors = getNodesWithErrors(ValidationMask.All, 'error', false);
    if (nodesWithFrontendErrors === ContextNotProvided) {
      // If the nodes are not provided, we cannot validate them
      return false;
    }

    const [nodes, validations] = nodesWithFrontendErrors;
    if (
      includeNonIncrementalValidations
        ? validations.length > 0
        : validations.filter((v) => !v.noIncrementalUpdates).length > 0
    ) {
      // Currently, SubForm is the only type of non-incremental validation that has a visibility included in All,
      // non-incremental validations from backend gets a StandardBackend visibility set. Therefore we want to show
      // errors in SubForm even if it only has an incremental validation which is why we don't filter on the nodes that get visibility,
      // even if the validation itself is filtered out for being non-incremental. We only need it not to block process/next.
      setNodeVisibility(nodes, ValidationMask.All);
      return true;
    }

    return false;
  });

  return useCallback(
    async (includeNonIncrementalValidations = false) => {
      const validateFn = validation.current === ContextNotProvided ? undefined : validation.current?.validating;
      if (!validateFn) {
        // If the validation context is not provided, we cannot validate
        return false;
      }

      await validateFn();
      return callback(includeNonIncrementalValidations);
    },
    [callback, validation],
  );
}
