import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { Validation } from 'src/features/validation/validationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Returns all validation messages for a given node.
 * Both validations connected to specific data model bindings,
 * and general component validations in a single list.
 */
const emptyArray = [];
export function useUnifiedValidationsForNode(node: LayoutNode | undefined): NodeValidation[] {
  const showAll = Validation.useShowAllBackendErrors();
  const validations = NodesInternal.useVisibleValidations(node, showAll);

  return useMemo(() => {
    if (!node) {
      return emptyArray;
    }

    return validations.map((validation) => ({ ...validation, node }));
  }, [node, validations]);
}
