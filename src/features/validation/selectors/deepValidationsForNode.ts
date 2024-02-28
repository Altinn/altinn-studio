import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { getValidationsForNode } from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { getVisibilityForNode } from 'src/features/validation/visibility/visibilityUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Returns all validation messages for a nodes children and optionally the node itself.
 */
export function useDeepValidationsForNode(
  node: LayoutNode | undefined,
  onlyChildren: boolean = false,
  onlyInRowUuid?: string,
): NodeValidation[] {
  const state = useValidationContext().state;
  const visibility = useValidationContext().visibility;

  return useMemo(() => {
    if (!node) {
      return [];
    }

    const restriction = onlyInRowUuid ? { onlyInRowUuid } : undefined;
    const nodesToValidate = onlyChildren ? node.flat(true, restriction) : [node, ...node.flat(true, restriction)];
    return nodesToValidate.flatMap((node) =>
      getValidationsForNode(node, state, getVisibilityForNode(node, visibility)),
    );
  }, [node, onlyChildren, onlyInRowUuid, state, visibility]);
}
