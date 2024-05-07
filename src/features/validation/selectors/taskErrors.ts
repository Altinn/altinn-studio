import { useMemo, useRef } from 'react';

import deepEqual from 'fast-deep-equal';

import type { BaseValidation, NodeValidation } from '..';

import {
  getValidationsForNode,
  getVisibilityMask,
  selectValidations,
  shouldValidateNode,
  validationsOfSeverity,
} from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { getVisibilityForNode } from 'src/features/validation/visibility/visibilityUtils';
import { useNodes } from 'src/utils/layout/NodesContext';

const emptyArray: [] = [];

/**
 * Returns all validation errors (not warnings, info, etc.) for a layout set.
 * This includes unmapped/task errors as well
 */
export function useTaskErrors(): {
  formErrors: NodeValidation<'error'>[];
  taskErrors: BaseValidation<'error'>[];
} {
  const selector = Validation.useSelector();
  const visibilitySelector = Validation.useVisibilitySelector();
  const visibleNodes = useVisibleNodes();

  const formErrors = useMemo(() => {
    if (!visibleNodes) {
      return emptyArray;
    }

    const formErrors: NodeValidation<'error'>[] = [];
    for (const node of visibleNodes) {
      formErrors.push(
        ...getValidationsForNode(node, selector, getVisibilityForNode(node, visibilitySelector), 'error'),
      );
    }

    return formErrors;
  }, [visibleNodes, selector, visibilitySelector]);

  const taskErrors = useMemo(() => {
    const taskErrors: BaseValidation<'error'>[] = [];

    const taskValidations = selector('taskValidations', (state) => state.state.task);
    const allShown = selector('allFieldsIfShown', (state) => {
      if (state.showAllErrors) {
        return { fields: state.state.fields };
      }
      return undefined;
    });
    if (allShown) {
      const backendMask = getVisibilityMask(['Backend', 'CustomBackend']);
      for (const field of Object.values(allShown.fields)) {
        taskErrors.push(...(selectValidations(field, backendMask, 'error') as BaseValidation<'error'>[]));
      }
    }

    for (const validation of validationsOfSeverity(taskValidations, 'error')) {
      taskErrors.push(validation);
    }

    return taskErrors;
  }, [selector]);

  return useMemo(() => ({ formErrors, taskErrors }), [formErrors, taskErrors]);
}

/**
 * Utility hook for preventing rerendering unless visible nodes actually change
 */
function useVisibleNodes() {
  const nodes = useNodes();
  const visibleNodes = useMemo(() => nodes.allNodes().filter(shouldValidateNode), [nodes]);
  const visibleNodesRef = useRef(visibleNodes);

  if (
    visibleNodes === visibleNodesRef.current ||
    deepEqual(
      visibleNodes.map((n) => n.item.id),
      visibleNodesRef.current.map((n) => n.item.id),
    )
  ) {
    return visibleNodesRef.current;
  } else {
    visibleNodesRef.current = visibleNodes;
    return visibleNodes;
  }
}
