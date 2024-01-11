import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { buildNodeValidation, validationsFromGroups } from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { getVisibilityForNode } from 'src/features/validation/visibility';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Get only the component validations which are not bound to any data model fields.
 */
export function useComponentValidationsForNode(node: LayoutNode): NodeValidation[] {
  const component = useValidationContext().state.components[node.item.id];
  const visibility = useValidationContext().visibility;

  return useMemo(() => {
    if (!component?.component) {
      return [];
    }
    const validations = validationsFromGroups(component.component!, getVisibilityForNode(node, visibility));
    return validations.map((validation) => buildNodeValidation(node, validation));
  }, [component, node, visibility]);
}
