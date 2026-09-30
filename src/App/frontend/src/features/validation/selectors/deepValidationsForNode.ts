import { FormStore } from 'src/features/form/FormContext';
import { useVisibleValidationsDeep } from 'src/features/validation/validationHooks';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { NodeRefValidation } from 'src/features/validation/index';

/**
 * Returns all validation messages for a nodes children and optionally the node itself.
 */
export function useDeepValidationsForNode(
  baseComponentId: string,
  includeSelf = true,
  restriction?: number | undefined,
  skipLastIdMutator = false,
): NodeRefValidation[] {
  const showAll = FormStore.validation.useShowAllUnboundValidations();
  const mask = showAll ? 'showAll' : 'visible';
  const indexedId = useIndexedId(baseComponentId, skipLastIdMutator);
  return useVisibleValidationsDeep(baseComponentId, indexedId, mask, includeSelf, restriction);
}
