import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Returns all validation messages for a given node.
 * Both validations connected to specific data model bindings,
 * and general component validations in a single list.
 */
const emptyArray = [];
export function useUnifiedValidationsForNode(node: LayoutNode | undefined): NodeValidation[] {
  const validations = NodesInternal.useVisibleValidations(node);

  return useMemo(() => {
    if (!node) {
      return emptyArray;
    }

    return validations.map((validation) => ({ ...validation, node }));
  }, [node, validations]);
}
