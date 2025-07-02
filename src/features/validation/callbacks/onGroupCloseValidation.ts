import { useCallback } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { getVisibilityMask } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { getRecursiveValidations } from 'src/features/validation/ValidationStorePlugin';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AllowedValidationMasks } from 'src/layout/common.generated';

/**
 * Checks if a repeating group row has validation errors when the group is closed.
 * If there are errors, the visibility is set, and will return true, indicating that the row should not be closed.
 */
export function useOnGroupCloseValidation() {
  const setNodeVisibility = NodesInternal.useSetNodeVisibility();
  const validating = Validation.useValidating();
  const nodeStore = NodesInternal.useStore();
  const lookups = useLayoutLookups();
  const idMutator = useComponentIdMutator();

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent(
    (baseComponentId: string, restriction: number | undefined, masks: AllowedValidationMasks): boolean => {
      const mask = getVisibilityMask(masks);
      const state = nodeStore.getState();
      const nodesWithErrors = getRecursiveValidations({
        id: idMutator(baseComponentId),
        baseId: baseComponentId,
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
    async (baseComponentId: string, restriction: number | undefined, masks: AllowedValidationMasks) => {
      await validating();
      return callback(baseComponentId, restriction, masks);
    },
    [callback, validating],
  );
}
