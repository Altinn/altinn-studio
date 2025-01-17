import { useCallback } from 'react';

import { useRefetchInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import { getVisibilityMask } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
import type { PageValidation } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

/**
 * Checks if a page has validation errors as specified by the config.
 * If there are errors, the visibility of the page is set to the specified mask.
 *
 */
export function useOnPageNavigationValidation() {
  const setNodeVisibility = NodesInternal.useSetNodeVisibility();
  const getNodeValidations = NodesInternal.useValidationsSelector();
  const validating = Validation.useValidating();
  const pageOrder = usePageOrder();
  const traversalSelector = useNodeTraversalSelector();
  const refetchInitialValidations = useRefetchInitialValidations();

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent(async (currentPage: LayoutPage, config: PageValidation): Promise<boolean> => {
    const pageConfig = config.page ?? 'current';
    const masks = config.show;

    const mask = getVisibilityMask(masks);
    let nodes: LayoutNode[] = [];

    const currentIndex = pageOrder.indexOf(currentPage.pageKey);

    if (pageConfig === 'current') {
      // Get nodes for current page
      nodes = traversalSelector((t) => t.with(currentPage).flat(), [currentPage]);
    } else if (pageConfig === 'currentAndPrevious') {
      // Get nodes for current and previous pages
      if (!pageOrder || currentIndex === -1) {
        return false;
      }
      const pageKeysToCheck = pageOrder.slice(0, currentIndex + 1);
      nodes = traversalSelector(
        (t) => {
          const out: LayoutNode[] = [];
          for (const key of pageKeysToCheck) {
            const page = t.findPage(key);
            if (page) {
              out.push(...t.with(page).flat());
            }
          }
          return out;
        },
        [...pageKeysToCheck],
      );
    } else {
      // Get all nodes
      nodes = traversalSelector((t) => t.flat(), []);
    }

    // We need to get updated validations from backend to validate subform
    if (nodes.some((n) => n.isType('Subform'))) {
      await refetchInitialValidations();
      await validating();
    }

    // Get nodes with errors along with their errors
    let onCurrentOrPreviousPage = false;
    const nodeErrors = nodes
      .map((n) => {
        const validations = getNodeValidations(n, mask, 'error');
        if (validations.length > 0) {
          onCurrentOrPreviousPage = onCurrentOrPreviousPage || pageOrder.indexOf(n.pageKey) <= currentIndex;
        }
        return [n, validations.length > 0] as const;
      })
      .filter(([_, e]) => e);

    if (nodeErrors.length > 0) {
      setNodeVisibility(
        nodeErrors.map(([n]) => n),
        mask,
      );

      // Only block navigation if there are errors on the current or previous pages
      return onCurrentOrPreviousPage;
    }

    return false;
  });

  return useCallback(
    async (currentPage: LayoutPage, config: PageValidation) => {
      await validating();
      return callback(currentPage, config);
    },
    [callback, validating],
  );
}
