import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useNavigationParam } from 'src/hooks/navigation';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { useEffectivePageValidation } from 'src/hooks/usePageValidation';

export function useNavigateToPageWithValidation() {
  const currentPageId = useNavigationParam('pageKey');
  const { navigateToPage, order, maybeSaveOnPageChange } = useNavigatePage();
  const onPageNavigationValidation = useOnPageNavigationValidation();
  const { getPageValidation } = useEffectivePageValidation(currentPageId ?? '');

  return async (targetPage: string, onNavigate?: () => void) => {
    if (!currentPageId || targetPage === currentPageId) {
      return;
    }

    const currentIndex = order.indexOf(currentPageId);
    const targetIndex = order.indexOf(targetPage);
    if (currentIndex === -1 || targetIndex === -1) {
      return;
    }

    const isForward = targetIndex > currentIndex;
    const validationOnNavigation = getPageValidation();

    await maybeSaveOnPageChange();

    if (isForward && validationOnNavigation) {
      const hasValidationErrors = await onPageNavigationValidation(currentPageId, validationOnNavigation);
      if (hasValidationErrors) {
        return;
      }
    }

    await navigateToPage(targetPage);
    onNavigate?.();
  };
}
