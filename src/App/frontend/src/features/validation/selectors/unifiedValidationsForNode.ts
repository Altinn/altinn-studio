import { useMemo } from 'react';

import type { NodeRefValidation } from '..';

import { Validation } from 'src/features/validation/validationContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';

/**
 * Returns all validation messages for a given node.
 * Both validations connected to specific data model bindings,
 * and general component validations in a single list.
 */
const emptyArray = [];
export function useUnifiedValidationsForNode(baseComponentId: string): NodeRefValidation[] {
  const nodeId = useIndexedId(baseComponentId);
  const showAll = Validation.useShowAllBackendErrors();
  const validations = NodesInternal.useVisibleValidations(nodeId, showAll);

  return useMemo(() => {
    if (!nodeId) {
      return emptyArray;
    }

    return validations.map((validation) => ({ ...validation, nodeId, baseComponentId }));
  }, [nodeId, validations, baseComponentId]);
}
