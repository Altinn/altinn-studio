import { useCallback } from 'react';

import { ValidationMask } from '..';

import {
  getValidationsForNode,
  getVisibilityMask,
  hasValidationErrors,
  shouldValidateNode,
  validationsFromGroups,
} from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

/**
 * Checks for any validation errors before submitting the form.
 * returns true if there are any errors, in that case submitting should be prevented.
 * It first shows any frontend errors.
 * If there are no frontend errors, it shows any backend errors.
 * If there are no backend errors, it shows any backend errors that cannot be mapped to a visible node. Including task errors.
 */
export function useOnFormSubmitValidation() {
  const setNodeVisibility = useValidationContext().setNodeVisibility;
  const state = useValidationContext().state;
  const validating = useValidationContext().validating;
  const setShowAllErrors = useValidationContext().setShowAllErrors;

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent((layoutPages: LayoutPages): boolean => {
    /*
     * First: check and show any frontend errors
     */
    const nodesWithFrontendErrors = layoutPages
      .allNodes()
      .filter(shouldValidateNode)
      .filter((n) => getValidationsForNode(n, state, ValidationMask.All, 'error').length > 0);

    if (nodesWithFrontendErrors.length > 0) {
      setNodeVisibility(nodesWithFrontendErrors, ValidationMask.All);
      return true;
    }

    /*
     * Normally, backend errors should be in sync with frontend errors.
     * But if not, show them now.
     */
    const nodesWithAnyError = layoutPages
      .allNodes()
      .filter(shouldValidateNode)
      .filter((n) => getValidationsForNode(n, state, ValidationMask.AllIncludingBackend, 'error').length > 0);

    if (nodesWithAnyError.length > 0) {
      setNodeVisibility(nodesWithAnyError, ValidationMask.All);
      return true;
    }

    /**
     * As a last resort, to prevent unknown error, show any backend errors
     * that cannot be mapped to any visible node.
     */
    const backendMask = getVisibilityMask(['Backend', 'CustomBackend']);
    const hasFieldErrors =
      Object.values(state.fields).flatMap((field) => validationsFromGroups(field, backendMask, 'error')).length > 0;

    if (hasFieldErrors || hasValidationErrors(state.task)) {
      setShowAllErrors(true);
      return true;
    }

    return false;
  });

  return useCallback(
    async (layoutPages: LayoutPages) => {
      await validating();
      return callback(layoutPages);
    },
    [callback, validating],
  );
}
