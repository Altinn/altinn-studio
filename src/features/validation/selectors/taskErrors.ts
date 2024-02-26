import { useMemo } from 'react';

import type { BaseValidation, NodeValidation } from '..';

import {
  getValidationsForNode,
  getVisibilityMask,
  selectValidations,
  shouldValidateNode,
  validationsOfSeverity,
} from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { getVisibilityForNode } from 'src/features/validation/visibility/visibilityUtils';
import { useNodes } from 'src/utils/layout/NodesContext';

/**
 * Returns all validation errors (not warnings, info, etc.) for a layout set.
 * This includes unmapped/task errors as well
 */
export function useTaskErrors(): {
  formErrors: NodeValidation<'error'>[];
  taskErrors: BaseValidation<'error'>[];
} {
  const pages = useNodes();
  const state = useValidationContext().state;
  const visibility = useValidationContext().visibility;
  const showAllErrors = useValidationContext().showAllErrors;

  return useMemo(() => {
    if (!pages) {
      return { formErrors: [], taskErrors: [] };
    }
    const formErrors: NodeValidation<'error'>[] = [];
    const taskErrors: BaseValidation<'error'>[] = [];

    for (const node of pages.allNodes().filter(shouldValidateNode)) {
      formErrors.push(...getValidationsForNode(node, state, getVisibilityForNode(node, visibility), 'error'));
    }

    if (showAllErrors) {
      const backendMask = getVisibilityMask(['Backend', 'CustomBackend']);
      for (const field of Object.values(state.fields)) {
        taskErrors.push(...(selectValidations(field, backendMask, 'error') as BaseValidation<'error'>[]));
      }
      for (const validation of validationsOfSeverity(state.task, 'error')) {
        taskErrors.push(validation);
      }
    }
    return { formErrors, taskErrors };
  }, [pages, showAllErrors, state, visibility]);
}
