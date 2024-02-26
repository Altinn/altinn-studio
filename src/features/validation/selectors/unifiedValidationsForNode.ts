import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { getValidationsForNode } from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { getVisibilityForNode } from 'src/features/validation/visibility/visibilityUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Returns all validation messages for a given node.
 * Both validations connected to specific data model bindings,
 * and general component validations in a single list.
 */
export function useUnifiedValidationsForNode(node: LayoutNode | undefined): NodeValidation[] {
  const state = useValidationContext().state;
  const visibility = useValidationContext().visibility;

  return useMemo(() => {
    if (!node) {
      return [];
    }
    return getValidationsForNode(node, state, getVisibilityForNode(node, visibility));
  }, [node, state, visibility]);
}
