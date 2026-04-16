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
  const [dataModels, otherDataElementBackendValidations, taskValidations, showAllBackendErrors] =
    FormStore.raw.useShallowSelector((state) => [
      state.data.models,
      state.validation.otherDataElementBackendValidations,
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

    const unified = [
      ...Object.values(dataModels).map((dataModel) => dataModel.validations.backend),
      ...Object.values(otherDataElementBackendValidations),
    ];

    // Unbound field errors
    for (const validations of unified) {
      for (const field of Object.values(validations)) {
        for (const validation of selectValidations(field, backendMask, 'error')) {
          // Only select backend errors which are not already visible through formErrors
          if (validation.backendValidationId && !boundErrorIds.has(validation.backendValidationId)) {
            allBackendErrors.push(validation as BaseValidation<'error'>);
          }
        }
      }
    }

    // Task errors
    allBackendErrors.push(...validationsOfSeverity(taskValidations, 'error'));

    return allBackendErrors?.length ? allBackendErrors : emptyArray;
  }, [dataModels, formErrors, otherDataElementBackendValidations, showAllBackendErrors, taskValidations]);

  return {
    formErrors,
    taskErrors,
  };
}
