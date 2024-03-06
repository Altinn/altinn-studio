import { useCallback } from 'react';

import { getValidationsForNode, getVisibilityMask, shouldValidateNode } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import type { AllowedValidationMasks } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Checks if a repeating group row has validation errors when the group is closed.
 * If there are errors, the visibility is set, and will return true, indicating that the row should not be closed.
 */
export function useOnGroupCloseValidation() {
  const setNodeVisibility = Validation.useSetNodeVisibility();
  const selector = Validation.useSelector();
  const validating = Validation.useValidating();

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent((node: LayoutNode, rowUuid: string, masks: AllowedValidationMasks): boolean => {
    const mask = getVisibilityMask(masks);

    const nodesWithErrors = node
      .flat(true, { onlyInRowUuid: rowUuid })
      .filter((n) => n.item.id !== node.item.id) // Exclude self, only check children
      .filter(shouldValidateNode)
      .filter((n) => getValidationsForNode(n, selector, mask, 'error').length > 0);

    if (nodesWithErrors.length > 0) {
      setNodeVisibility(nodesWithErrors, mask);
      return true;
    }

    return false;
  });

  return useCallback(
    async (node: LayoutNode, rowUuid: string, masks: AllowedValidationMasks) => {
      await validating();
      return callback(node, rowUuid, masks);
    },
    [callback, validating],
  );
}
