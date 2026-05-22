import { useMemo } from 'react';

import type { NodeRefValidation } from '..';

import { FormStore } from 'src/features/form/FormContext';
import { useVisibleValidations } from 'src/features/validation/derivedValidations';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';

/**
 * Returns all validation messages for a given node.
 * Both validations connected to specific data model bindings,
 * and general component validations in a single list.
 */
const emptyArray = [];
export function useUnifiedValidationsForNode(baseComponentId: string): NodeRefValidation[] {
  const nodeId = useIndexedId(baseComponentId);
  const showAll = FormStore.validation.useShowAllUnboundValidations();
  const validations = useVisibleValidations(nodeId, showAll);

  return useMemo(() => {
    if (!nodeId) {
      return emptyArray;
    }

    return validations.map((validation) => ({ ...validation, nodeId, baseComponentId }));
  }, [nodeId, validations, baseComponentId]);
}
