import { useMemo } from 'react';

import type { ComponentValidation, NodeValidation } from '..';

import { Validation } from 'src/features/validation/validationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

/**
 * Get only the component validations which are not bound to any data model fields.
 */
export function useComponentValidationsForNode(node: LayoutNode): NodeValidation<ComponentValidation>[] {
  const showAll = Validation.useShowAllBackendErrors();
  const component = NodesInternal.useVisibleValidations(node, showAll);

  return useMemo(
    () => component.filter((v) => !('bindingKey' in v)).map((validation) => ({ ...validation, node })),
    [component, node],
  );
}
