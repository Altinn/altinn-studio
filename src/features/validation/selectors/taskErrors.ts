import { useMemo } from 'react';

import { ContextNotProvided } from 'src/core/contexts/context';
import { getVisibilityMask, selectValidations, validationsOfSeverity } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { AnyValidation, BaseValidation, NodeRefValidation } from 'src/features/validation/index';

const emptyArray: never[] = [];

/**
 * Returns all validation errors (not warnings, info, etc.) for a layout set.
 * This includes unmapped/task errors as well
 */
export function useTaskErrors(): {
  formErrors: NodeRefValidation<AnyValidation<'error'>>[];
  taskErrors: BaseValidation<'error'>[];
} {
  const selector = Validation.useSelector();
  const _formErrors = NodesInternal.useAllValidations('visible', 'error');
  const formErrors = _formErrors === ContextNotProvided ? emptyArray : _formErrors;

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
