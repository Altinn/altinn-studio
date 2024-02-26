import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { buildNodeValidation, selectValidations, validationNodeFilter } from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { getVisibilityForNode } from 'src/features/validation/visibility/visibilityUtils';
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
    const validations = selectValidations(component.component!, getVisibilityForNode(node, visibility));
    return validations.filter(validationNodeFilter(node)).map((validation) => buildNodeValidation(node, validation));
  }, [component, node, visibility]);
}
