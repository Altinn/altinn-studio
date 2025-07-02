import { useCallback } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { getVisibilityMask } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { getRecursiveValidations } from 'src/features/validation/ValidationStorePlugin';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AllowedValidationMasks } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Checks if a repeating group row has validation errors when the group is closed.
 * If there are errors, the visibility is set, and will return true, indicating that the row should not be closed.
 */
export function useOnGroupCloseValidation() {
  const setNodeVisibility = NodesInternal.useSetNodeVisibility();
  const validating = Validation.useValidating();
  const nodeStore = NodesInternal.useStore();
  const lookups = useLayoutLookups();

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent(
    (node: LayoutNode, restriction: number | undefined, masks: AllowedValidationMasks): boolean => {
      const mask = getVisibilityMask(masks);
      const state = nodeStore.getState();
      const nodesWithErrors = getRecursiveValidations({
        id: node.id,
        baseId: node.baseId,
        includeHidden: false,
        includeSelf: false,
        severity: 'error',
        restriction,
        mask,
        state,
        lookups,
      }).map((v) => v.nodeId);

      if (nodesWithErrors.length > 0) {
        setNodeVisibility(nodesWithErrors, mask);
        return true;
      }

      return false;
    },
  );

  return useCallback(
    async (node: LayoutNode, restriction: number | undefined, masks: AllowedValidationMasks) => {
      await validating();
      return callback(node, restriction, masks);
    },
    [callback, validating],
  );
}
