import { useMemo } from 'react';

import type { NodeValidation } from '..';

import { buildNodeValidation, selectValidations, validationNodeFilter } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { getVisibilityForNode } from 'src/features/validation/visibility/visibilityUtils';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Get only the component validations which are not bound to any data model fields.
 */
export function useComponentValidationsForNode(node: LayoutNode): NodeValidation[] {
  const componentSelector = Validation.useComponentSelector();
  const visibilitySelector = Validation.useVisibilitySelector();

  return useMemo(() => {
    const component = componentSelector(node.item.id, (components) => components[node.item.id]);
    if (!component?.component) {
      return [];
    }
    const validations = selectValidations(component.component!, getVisibilityForNode(node, visibilitySelector));
    return validations.filter(validationNodeFilter(node)).map((validation) => buildNodeValidation(node, validation));
  }, [componentSelector, node, visibilitySelector]);
}
