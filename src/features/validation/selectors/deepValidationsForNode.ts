import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { getValidationsForNode, shouldValidateNode } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
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
  const selector = Validation.useSelector();
  const visibilitySelector = Validation.useVisibilitySelector();

  return useMemo(() => {
    if (!node) {
      return [];
    }

    const restriction = onlyInRowUuid ? { onlyInRowUuid } : undefined;
    const deepNodes = onlyChildren ? node.flat(true, restriction) : [node, ...node.flat(true, restriction)];
    return deepNodes
      .filter(shouldValidateNode)
      .flatMap((node) => getValidationsForNode(node, selector, getVisibilityForNode(node, visibilitySelector)));
  }, [node, onlyChildren, onlyInRowUuid, selector, visibilitySelector]);
}
