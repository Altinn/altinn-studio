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
import { useAllValidations } from 'src/features/validation/validationHooks';
import type { FieldValidation } from 'src/features/validation';

const emptyArray: never[] = [];
const emptyBackendValidations: Record<string, Record<string, FieldValidation[]>> = {};

/**
 * Returns all validation errors (not warnings, info, etc.) for a layout set.
 * This includes unmapped/task errors as well
 */
export function useTaskErrors(): {
  formErrors: NodeRefValidation<AnyValidation<'error'>>[];
  taskErrors: BaseValidation<'error'>[];
} {
  const [backendValidationsByDataType, taskValidations, showAllUnboundValidations] = FormStore.raw.useMemoSelector(
    (state) => {
      const showAllUnboundValidations = state.validation.showAllUnboundValidations;
      return [
        showAllUnboundValidations
          ? Object.fromEntries(
              Object.entries(state.data.models).map(([dataType, dataModel]) => [
                dataType,
                dataModel.validations.backend,
              ]),
            )
          : emptyBackendValidations,
        state.validation.state.task,
        showAllUnboundValidations,
      ] as const;
    },
  );

  const formErrorVisibility: NodeVisibility = showAllUnboundValidations ? 'showAll' : 'visible';

  const _formErrors = useAllValidations(formErrorVisibility, 'error');
  const formErrors = !_formErrors.length ? emptyArray : _formErrors;

  const taskErrors = useMemo(() => {
    if (!showAllUnboundValidations) {
      return emptyArray;
    }

    const backendMask = ValidationMask.Backend | ValidationMask.CustomBackend;
    const allBackendErrors: BaseValidation<'error'>[] = [];

    const boundErrorIds = new Set(formErrors.filter(hasBackendValidationId).map((v) => v.backendValidationId));

    // Unbound field errors
    for (const validations of Object.values(backendValidationsByDataType)) {
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
  }, [backendValidationsByDataType, formErrors, showAllUnboundValidations, taskValidations]);

  return {
    formErrors,
    taskErrors,
  };
}
