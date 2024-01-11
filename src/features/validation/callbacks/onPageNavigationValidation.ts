import { useCallback } from 'react';

import { getValidationsForNode, getVisibilityMask, shouldValidateNode } from 'src/features/validation/utils';
import { useValidationContext } from 'src/features/validation/validationContext';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { useOrder } from 'src/hooks/useNavigatePage';
import type { PageValidation } from 'src/layout/common.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

/**
 * Checks if a page has validation errors as specified by the config.
 * If there are errors, the visibility of the page is set to the specified mask.
 *
 */
export function useOnPageNavigationValidation() {
  const setNodeVisibility = useValidationContext().setNodeVisibility;
  const state = useValidationContext().state;
  const validating = useValidationContext().validating;
  const pageOrder = useOrder();

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent((currentPage: LayoutPage, config: PageValidation): boolean => {
    const pageConfig = config.page ?? 'current';
    const masks = config.show;

    const mask = getVisibilityMask(masks);
    let nodes: LayoutNode[] = [];

    const currentIndex = pageOrder.indexOf(currentPage.top.myKey);

    if (pageConfig === 'current') {
      // Get nodes for current page
      nodes = currentPage.flat(true);
    } else if (pageConfig === 'currentAndPrevious') {
      // Get nodes for current and previous pages
      if (!pageOrder || currentIndex === -1) {
        return false;
      }
      const pageKeysToCheck = pageOrder.slice(0, currentIndex + 1);
      const layoutPagesToCheck = pageKeysToCheck.map((key) => currentPage.top.collection.all()[key]);
      nodes = layoutPagesToCheck.flatMap((page) => page.flat(true));
    } else {
      // Get all nodes
      nodes = currentPage.top.collection.allNodes();
    }

    // Get nodes with errors along with their errors
    const nodeErrors = nodes
      .filter(shouldValidateNode)
      .map((n) => [n, getValidationsForNode(n, state, mask, 'error')] as const)
      .filter(([_, e]) => e.length > 0);

    if (nodeErrors.length > 0) {
      setNodeVisibility(
        nodeErrors.map(([n]) => n),
        mask,
      );

      // Only block navigation if there are errors on the current or previous pages
      return nodeErrors.some(([_, e]) => e.some((v) => pageOrder.indexOf(v.pageKey) <= currentIndex));
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
