import { useMemo } from 'react';

import { Validation } from 'src/features/validation/validationContext';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { ComponentValidation, NodeRefValidation } from 'src/features/validation/index';

/**
 * Get only the component validations which are not bound to any data model fields.
 */
export function useComponentValidationsFor(baseComponentId: string): NodeRefValidation<ComponentValidation>[] {
  const showAll = Validation.useShowAllBackendErrors();
  const indexedId = useIndexedId(baseComponentId);
  const component = NodesInternal.useVisibleValidations(indexedId, showAll);

  return useMemo(
    () =>
      component
        .filter((v) => !('bindingKey' in v))
        .map((validation) => ({ ...validation, nodeId: indexedId, baseComponentId })),
    [baseComponentId, component, indexedId],
  );
}
