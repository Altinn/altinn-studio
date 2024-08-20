import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeTraversal } from 'src/utils/layout/useNodeTraversal';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { TraversalRestriction } from 'src/utils/layout/useNodeTraversal';

const emptyArray: NodeValidation[] = [];

/**
 * Returns all validation messages for a nodes children and optionally the node itself.
 */
export function useDeepValidationsForNode(
  node: LayoutNode | undefined,
  onlyChildren: boolean = false,
  restriction?: TraversalRestriction,
): NodeValidation[] {
  const validationsSelector = NodesInternal.useValidationsSelector();
  const nodesToValidate = useNodeTraversal((t) => {
    if (!node || t.targetIsRoot()) {
      return [];
    }

    if (onlyChildren) {
      return t.children(undefined, restriction);
    }

    return t.flat(undefined, restriction);
  }, node);

  return useMemo(() => {
    if (!nodesToValidate || nodesToValidate.length === 0) {
      return emptyArray;
    }

    return nodesToValidate.flatMap((node) =>
      validationsSelector(node, 'visible').map((validation) => ({ ...validation, node })),
    );
  }, [nodesToValidate, validationsSelector]);
}
