import { useMemo } from 'react';

import { FormStore } from 'src/features/form/FormContext';
import {
  type AnyValidation,
  type BaseValidation,
  hasBackendValidationId,
  type NodeRefValidation,
  type NodeVisibility,
  ValidationMask,
} from 'src/features/validation/index';
import { selectValidations, validationsOfSeverity } from 'src/features/validation/utils';

const emptyArray: never[] = [];

/**
 * Returns all validation errors (not warnings, info, etc.) for a layout set.
 * This includes unmapped/task errors as well
 */
export function useTaskErrors(): {
  formErrors: NodeRefValidation<AnyValidation<'error'>>[];
  taskErrors: BaseValidation<'error'>[];
} {
  const [dataModels, taskValidations, showAllBackendErrors] = FormStore.raw.useShallowSelector((state) => [
    state.validation.state.dataModels,
    state.validation.state.task,
    state.validation.showAllBackendErrors,
  ]);

  const formErrorVisibility: NodeVisibility = showAllBackendErrors ? 'showAll' : 'visible';

  const _formErrors = FormStore.nodes.useAllValidations(formErrorVisibility, 'error');
  const formErrors = !_formErrors.length ? emptyArray : _formErrors;

  const taskErrors = useMemo(() => {
    if (!showAllBackendErrors) {
      return emptyArray;
    }

    const backendMask = ValidationMask.Backend | ValidationMask.CustomBackend;
    const allBackendErrors: BaseValidation<'error'>[] = [];

    const boundErrorIds = new Set(formErrors.filter(hasBackendValidationId).map((v) => v.backendValidationId));

    // Unbound field errors
    for (const fields of Object.values(dataModels)) {
      for (const field of Object.values(fields)) {
        allBackendErrors.push(
          ...(selectValidations(field, backendMask, 'error').filter(
            // Only select backend errors which are not already visible through formErrors
            (v) => v.backendValidationId && !boundErrorIds.has(v.backendValidationId),
          ) as BaseValidation<'error'>[]),
        );
      }
    }

    // Task errors
    allBackendErrors.push(...validationsOfSeverity(taskValidations, 'error'));

    return allBackendErrors?.length ? allBackendErrors : emptyArray;
  }, [dataModels, formErrors, showAllBackendErrors, taskValidations]);

  return {
    formErrors,
    taskErrors,
  };
}
