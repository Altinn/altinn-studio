import { useMemo } from 'react';

import type { AnyValidation, BaseValidation, NodeValidation } from '..';

import { getVisibilityMask, selectValidations, validationsOfSeverity } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeTraversalSelectorSilent } from 'src/utils/layout/useNodeTraversal';

const emptyArray: [] = [];

/**
 * Returns all validation errors (not warnings, info, etc.) for a layout set.
 * This includes unmapped/task errors as well
 */
export function useTaskErrors(): {
  formErrors: NodeValidation<AnyValidation<'error'>>[];
  taskErrors: BaseValidation<'error'>[];
} {
  const selector = Validation.useSelector();
  const nodeValidationsSelector = NodesInternal.useValidationsSelector();
  const traversalSelector = useNodeTraversalSelectorSilent();

  const formErrors = useMemo(() => {
    if (!traversalSelector) {
      return emptyArray;
    }

    const formErrors: NodeValidation<AnyValidation<'error'>>[] = [];
    const allNodes = traversalSelector((t) => t.allNodes(), []);
    for (const node of allNodes ?? emptyArray) {
      const validations = nodeValidationsSelector(node, 'visible', 'error') as AnyValidation<'error'>[];
      formErrors.push(...validations.map((v) => ({ ...v, node })));
    }

    return formErrors;
  }, [nodeValidationsSelector, traversalSelector]);

  const taskErrors = useMemo(() => {
    if (!selector((state) => state.showAllErrors, [])) {
      return emptyArray;
    }

    const allBackendErrors: BaseValidation<'error'>[] = [];

    // Show all backend errors
    const mask = getVisibilityMask(['Backend', 'CustomBackend']);
    const dataModels = selector((state) => state.state.dataModels, []);
    for (const fields of Object.values(dataModels)) {
      for (const field of Object.values(fields)) {
        allBackendErrors.push(...(selectValidations(field, mask, 'error') as BaseValidation<'error'>[]));
      }
    }

    // Task errors
    allBackendErrors.push(
      ...validationsOfSeverity(
        selector((state) => state.state.task, []),
        'error',
      ),
    );

    return allBackendErrors;
  }, [selector]);

  return useMemo(() => ({ formErrors, taskErrors }), [formErrors, taskErrors]);
}
