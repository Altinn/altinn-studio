import { useCallback } from 'react';

import { getValidationsForNode, getVisibilityMask, shouldValidateNode } from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { useAsRef } from 'src/hooks/useAsRef';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { useWaitForState } from 'src/hooks/useWaitForState';
import type { AllowedValidationMasks } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Checks if a repeating group row has validation errors when the group is closed.
 * If there are errors, the visibility is set, and will return true, indicating that the row should not be closed.
 */
export function useOnGroupCloseValidation() {
  const setNodeVisibility = useValidationContext().setNodeVisibility;
  const state = useValidationContext().state;
  const validating = useValidationContext().validating;
  const lastBackendValidations = useValidationContext().backendValidationsProcessedLast;
  const lastBackendValidationsRef = useAsRef(lastBackendValidations);
  const waitForBackendValidations = useWaitForState(lastBackendValidationsRef);

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent((node: LayoutNode, rowIndex: number, masks: AllowedValidationMasks): boolean => {
    const mask = getVisibilityMask(masks);

    const nodesWithErrors = node
      .flat(true, rowIndex)
      .filter((n) => n.item.id !== node.item.id) // Exclude self, only check children
      .filter(shouldValidateNode)
      .filter((n) => getValidationsForNode(n, state, mask, 'error').length > 0);

    if (nodesWithErrors.length > 0) {
      setNodeVisibility(nodesWithErrors, mask);
      return true;
    }

    return false;
  });

  return useCallback(
    async (node: LayoutNode, rowIndex: number, masks: AllowedValidationMasks) => {
      const localWait = await validating();
      await waitForBackendValidations(localWait);
      return callback(node, rowIndex, masks);
    },
    [callback, validating, waitForBackendValidations],
  );
}
