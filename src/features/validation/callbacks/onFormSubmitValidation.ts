import { useCallback } from 'react';

import { ValidationMask } from '..';

import { ContextNotProvided } from 'src/core/contexts/context';
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

    /*
     * Check if there are any frontend validation errors, and if so, show them now and block submit
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
