import { useMemo } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import { useVisibleValidations } from 'src/features/validation/validationHooks';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import type { ComponentValidation, NodeRefValidation } from 'src/features/validation/index';

/**
 * Get only the component validations which are not bound to any data model fields.
 */
export function useComponentValidationsFor(baseComponentId: string): NodeRefValidation<ComponentValidation>[] {
  const showAll = FormStore.validation.useShowAllUnboundValidations();
  const indexedId = useIndexedId(baseComponentId);
  const component = useVisibleValidations(indexedId, showAll);

  return useMemo(
    () =>
      component
        .filter((v) => !('bindingKey' in v))
        .map((validation) => ({ ...validation, nodeId: indexedId, baseComponentId })),
    [baseComponentId, component, indexedId],
  );
}
