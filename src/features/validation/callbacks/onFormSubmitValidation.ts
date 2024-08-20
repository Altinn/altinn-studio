import { useCallback } from 'react';

import { ValidationMask } from '..';

import { ContextNotProvided } from 'src/core/contexts/context';
import { getVisibilityMask, selectValidations } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeTraversalSelectorLax } from 'src/utils/layout/useNodeTraversal';

/**
 * Checks for any validation errors before submitting the form.
 * returns true if there are any errors, in that case submitting should be prevented.
 * It first shows any frontend errors.
 * If there are no frontend errors, it shows any backend errors.
 * If there are no backend errors, it shows any backend errors that cannot be mapped to a visible node. Including task errors.
 */
export function useOnFormSubmitValidation() {
  const validation = Validation.useLaxRef();
  const setNodeVisibility = NodesInternal.useLaxSetNodeVisibility();
  const nodeValidationsSelector = NodesInternal.useLaxValidationsSelector();
  const traversalSelector = useNodeTraversalSelectorLax();

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent((): boolean => {
    if (
      validation.current === ContextNotProvided ||
      nodeValidationsSelector === ContextNotProvided ||
      setNodeVisibility === ContextNotProvided
    ) {
      // If the validation context or nodes context is not provided, we cannot validate
      return false;
    }

    const state = validation.current.state;
    const setShowAllErrors = validation.current.setShowAllErrors;

    /*
     * First: check and show any frontend errors
     */
    const nodesWithFrontendErrors = traversalSelector(
      (t) => t.allNodes().filter((n) => nodeValidationsSelector(n, ValidationMask.All, 'error').length > 0),
      [nodeValidationsSelector],
    );

    if (!nodesWithFrontendErrors || nodesWithFrontendErrors === ContextNotProvided) {
      // If the nodes are not provided, we cannot validate them
      return false;
    }

    if (nodesWithFrontendErrors.length > 0) {
      setNodeVisibility(nodesWithFrontendErrors, ValidationMask.All);
      return true;
    }

    /*
     * Normally, backend errors should be in sync with frontend errors.
     * But if not, show them now.
     */
    const nodesWithAnyError = traversalSelector(
      (t) =>
        t.allNodes().filter((n) => nodeValidationsSelector(n, ValidationMask.AllIncludingBackend, 'error').length > 0),
      [nodeValidationsSelector],
    );

    if (nodesWithAnyError !== ContextNotProvided && nodesWithAnyError.length > 0) {
      setNodeVisibility(nodesWithAnyError, ValidationMask.All);
      return true;
    }

    /**
     * As a last resort, to prevent unknown error, show any backend errors
     * that cannot be mapped to any visible node.
     */
    const backendMask = getVisibilityMask(['Backend', 'CustomBackend']);
    const hasFieldErrors =
      Object.values(state.fields).flatMap((field) => selectValidations(field, backendMask, 'error')).length > 0;

    if (hasFieldErrors) {
      setShowAllErrors(true);
      return true;
    }

    return false;
  });

  return useCallback(async () => {
    const validating = validation.current === ContextNotProvided ? undefined : validation.current?.validating;
    if (!validating) {
      // If the validation context is not provided, we cannot validate
      return false;
    }

    await validating();
    return callback();
  }, [callback, validation]);
}
