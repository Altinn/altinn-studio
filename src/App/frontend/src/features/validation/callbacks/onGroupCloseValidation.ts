import { FormStore } from 'src/features/form/FormContext';
import { FormBootstrap } from 'src/features/formBootstrap/FormBootstrap';
import { getVisibilityMask } from 'src/features/validation/utils';
import { useWaitForValidation } from 'src/features/validation/validationContext';
import { getRecursiveValidations, makeComponentIdIndex } from 'src/features/validation/ValidationStorePlugin';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import type { NodeRefValidation } from 'src/features/validation';
import type { AllowedValidationMasks } from 'src/layout/common.generated';

/**
 * Checks if a repeating group row has validation errors when the group is closed.
 * If there are errors, the visibility is set, and will return true, indicating that the row should not be closed.
 */
export function useOnGroupCloseValidation() {
  const setNodeVisibility = FormStore.nodes.useSetNodeVisibility();
  const validating = useWaitForValidation();
  const formStore = FormStore.raw.useStore();
  const lookups = FormBootstrap.useLayoutLookups();
  const idMutator = useComponentIdMutator(true);

  /* Ensures the callback will have the latest state */
  const callback = useOurEffectEvent(
    (baseComponentId: string, restriction: number | undefined, masks: AllowedValidationMasks): boolean => {
      const mask = getVisibilityMask(masks);
      const state = formStore.getState();
      const errors: NodeRefValidation[] = [];
      getRecursiveValidations({
        id: idMutator(baseComponentId),
        baseId: baseComponentId,
        includeHidden: false,
        includeSelf: false,
        severity: 'error',
        restriction,
        mask,
        state,
        lookups,
        baseToIndexedMap: makeComponentIdIndex(state),
        output: errors,
      });

      const nodesWithErrors = errors.map((v) => v.nodeId);

      if (nodesWithErrors.length > 0) {
        setNodeVisibility(nodesWithErrors, mask);
        return true;
      }

      return false;
    },
  );

  return async (baseComponentId: string, restriction: number | undefined, masks: AllowedValidationMasks) => {
    await validating();
    return callback(baseComponentId, restriction, masks);
  };
}
