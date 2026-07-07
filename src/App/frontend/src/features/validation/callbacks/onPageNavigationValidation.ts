import { useCallback } from 'react';

import { useRefetchInitialValidations } from 'src/core/queries/backendValidation';
import { FormStore } from 'src/features/form/FormContext';
import { getValidationsForNode } from 'src/features/validation/deriveValidationState';
import { getVisibilityMask } from 'src/features/validation/utils';
import { useWaitForValidation } from 'src/features/validation/validationContext';
import { useGetDerivedValidationState } from 'src/features/validation/validationHooks';
import { usePageOrder } from 'src/hooks/useNavigatePage';
import { useOurEffectEvent } from 'src/hooks/useOurEffectEvent';
import type { PageValidation } from 'src/layout/common.generated';

/**
 * Checks if a page has validation errors as specified by the config.
 * If there are errors, the visibility of the page is set to the specified mask.
 **/
export function useOnPageNavigationValidation() {
  const setPageValidationMask = FormStore.validation.useSetPageValidationMask();
  const getDerivedValidationState = useGetDerivedValidationState();
  const validating = useWaitForValidation();
  const pageOrder = usePageOrder();
  const refetchInitialValidations = useRefetchInitialValidations();

  /* Ensures the callback will have the latest state */
  const callback = useOurEffectEvent(async (currentPage: string, config: PageValidation): Promise<boolean> => {
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

    let shouldCheckPage: (pageKey: string) => boolean = () => true; // Defaults to all pages
    if (pageConfig === 'current') {
      shouldCheckPage = (pageKey: string) => pageKey === currentPage;
    } else if (pageConfig === 'currentAndPrevious') {
      shouldCheckPage = (pageKey: string) => currentOrPreviousPages.has(pageKey);
    }

    const buildScope = () => {
      const derived = getDerivedValidationState();
      const nodeIdsPerPage = new Map<string, string[]>();
      const nodesOnCurrentOrPreviousPages = new Set<string>();
      let hasSubform = false;

      for (const node of derived.nodes) {
        if (currentOrPreviousPages.has(node.pageKey)) {
          nodesOnCurrentOrPreviousPages.add(node.id);
        }
        if (!shouldCheckPage(node.pageKey)) {
          continue;
        }
        if (node.intermediateItem.type === 'Subform') {
          hasSubform = true;
        }
        const nodes = nodeIdsPerPage.get(node.pageKey) ?? [];
        nodes.push(node.id);
        nodeIdsPerPage.set(node.pageKey, nodes);
      }

      return { derived, hasSubform, nodeIdsPerPage, nodesOnCurrentOrPreviousPages };
    };

    let scope = buildScope();

    // We need to get updated validations from backend to validate subform
    if (scope.hasSubform) {
      await refetchInitialValidations();
      await validating();
      scope = buildScope();
    }

    // Get nodes with errors along with their errors
    let onCurrentOrPreviousPage = false;
    let hasErrors = false;
    for (const [pageKey, nodeIds] of scope.nodeIdsPerPage.entries()) {
      const hasErrorsOnPage = nodeIds.some((id) => {
        const validations = getValidationsForNode(scope.derived, id, mask, 'error');
        if (validations.length > 0) {
          onCurrentOrPreviousPage = onCurrentOrPreviousPage || scope.nodesOnCurrentOrPreviousPages.has(id);
          return true;
        }
        return false;
      });

      setPageValidationMask(pageKey, hasErrorsOnPage ? mask : undefined);
      hasErrors = hasErrors || hasErrorsOnPage;
    }

    return hasErrors ? onCurrentOrPreviousPage : false;
  });

  return useCallback(
    async (currentPage: string, config: PageValidation) => {
      await validating();
      return callback(currentPage, config);
    },
    [callback, validating],
  );
}
