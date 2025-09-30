import { useCallback } from 'react';

import { useRefetchInitialValidations } from 'src/features/validation/backendValidation/backendValidationQuery';
import { getVisibilityMask } from 'src/features/validation/utils';
import { Validation } from 'src/features/validation/validationContext';
import { useEffectEvent } from 'src/hooks/useEffectEvent';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { PageValidation } from 'src/layout/common.generated';

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
  const nodeStore = NodesInternal.useStore();
  const refetchInitialValidations = useRefetchInitialValidations();

  /* Ensures the callback will have the latest state */
  const callback = useEffectEvent(async (currentPage: string, config: PageValidation): Promise<boolean> => {
    const pageConfig = config.page ?? 'current';
    const masks = config.show;
    const mask = getVisibilityMask(masks);
    const currentIndex = pageOrder.indexOf(currentPage);

    if (!pageOrder || currentIndex === -1) {
      return false;
    }
    const currentOrPreviousPages = new Set<string>();
    for (const pageKey of pageOrder.slice(0, currentIndex + 1)) {
      currentOrPreviousPages.add(pageKey);
    }

    const state = nodeStore.getState();
    const nodeIds: string[] = [];
    const nodesOnCurrentOrPreviousPages = new Set<string>();
    let hasSubform = false;

    let shouldCheckPage: (pageKey: string) => boolean = () => true; // Defaults to all pages
    if (pageConfig === 'current') {
      shouldCheckPage = (pageKey: string) => pageKey === currentPage;
    } else if (pageConfig === 'currentAndPrevious') {
      shouldCheckPage = (pageKey: string) => currentOrPreviousPages.has(pageKey);
    }

    for (const nodeData of Object.values(state.nodeData)) {
      if (currentOrPreviousPages.has(nodeData.pageKey)) {
        nodesOnCurrentOrPreviousPages.add(nodeData.id);
      }
      if (!shouldCheckPage(nodeData.pageKey)) {
        continue;
      }
      if (nodeData.nodeType === 'Subform') {
        hasSubform = true;
      }
      nodeIds.push(nodeData.id);
    }

    // We need to get updated validations from backend to validate subform
    if (hasSubform) {
      await refetchInitialValidations();
      await validating();
    }

    // Get nodes with errors along with their errors
    let onCurrentOrPreviousPage = false;
    const nodeErrors = nodeIds
      .map((id) => {
        const validations = getNodeValidations(id, mask, 'error');
        if (validations.length > 0) {
          onCurrentOrPreviousPage = onCurrentOrPreviousPage || nodesOnCurrentOrPreviousPages.has(id);
        }
        return [id, validations.length > 0] as const;
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
    async (currentPage: string, config: PageValidation) => {
      await validating();
      return callback(currentPage, config);
    },
    [callback, validating],
  );
}
