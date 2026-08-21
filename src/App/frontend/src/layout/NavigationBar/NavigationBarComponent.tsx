import React from 'react';

import { NavigationBar, useIsMobile } from '@app/form-component';

import { FormStore } from 'src/features/form/FormContext';
import { useGetNavigationIsPrevented } from 'src/features/navigation/utils';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useNavigationParam } from 'src/hooks/navigation';
import { useAsRef } from 'src/hooks/useAsRef';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { usePageValidation } from 'src/hooks/usePageValidation';
import { useCurrentProcessKey, useProcessingMutationWithKey } from 'src/hooks/useProcessingMutation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { NavigatePageProcessKey } from 'src/hooks/useProcessingMutation';
import type { PropsFromGenericComponent } from 'src/layout';

export function NavigationBarComponent({ baseComponentId }: PropsFromGenericComponent<'NavigationBar'>) {
  const { id, compact, validateOnForward, validateOnBackward } = useItemWhenType(baseComponentId, 'NavigationBar');
  const [showMenu, setShowMenu] = React.useState(false);
  const isCompact = useIsMobile() || compact === true;
  const currentPageId = useNavigationParam('pageKey') ?? '';
  const { navigateToPage, order, maybeSaveOnPageChange } = useNavigatePage();
  const onPageNavigationValidation = useOnPageNavigationValidation();
  const performProcess = useProcessingMutationWithKey<NavigatePageProcessKey>('navigate-page');
  const currentProcessKey = useCurrentProcessKey<NavigatePageProcessKey>('navigate-page');
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();

  const { getPageValidation } = usePageValidation(baseComponentId);
  // Use component-level validation if set, otherwise fall back to page-level
  // When page-level validation is set, only validate forward navigation
  const validationOnForward = getPageValidation() ?? validateOnForward;
  const validationOnBackward = getPageValidation() ? undefined : validateOnBackward;

  const getNavigationIsPrevented = useGetNavigationIsPrevented();

  // Bundle everything the click handler reads into a ref so the handler identity stays stable across
  // navigations. This lets the memoized NavigationPageButton bail out of re-rendering.
  const clickStateRef = useAsRef({
    order,
    currentPageId,
    layoutLookups,
    baseComponentId,
    maybeSaveOnPageChange,
    validationOnForward,
    validationOnBackward,
    onPageNavigationValidation,
    navigateToPage,
  });

  const handleNavigationClick = React.useCallback(
    (pageId: string) =>
      performProcess(pageId, async () => {
        const {
          order,
          currentPageId,
          layoutLookups,
          baseComponentId,
          maybeSaveOnPageChange,
          validationOnForward,
          validationOnBackward,
          onPageNavigationValidation,
          navigateToPage,
        } = clickStateRef.current;

        const currentIndex = order.indexOf(currentPageId);
        const newIndex = order.indexOf(pageId);

        const isForward = newIndex > currentIndex && currentIndex !== -1;
        const isBackward = newIndex < currentIndex && currentIndex !== -1;

        const pageKey = layoutLookups.componentToPage[baseComponentId];

        if (pageId === currentPageId || newIndex === -1 || !pageKey) {
          return;
        }

        await maybeSaveOnPageChange();

        if (isForward && validationOnForward && (await onPageNavigationValidation(pageKey, validationOnForward))) {
          // Block navigation if validation fails
          return;
        }

        if (isBackward && validationOnBackward && (await onPageNavigationValidation(pageKey, validationOnBackward))) {
          // Block navigation if validation fails
          return;
        }

        setShowMenu(false);
        navigateToPage(pageId, { skipAutoSave: true });
      }),
    [performProcess, clickStateRef],
  );

  if (!order) {
    return null;
  }

  return (
    <NavigationBar
      componentId={id}
      pages={order.map((pageId) => ({
        id: pageId,
        // Note: intentionally not disabled by `isAnyProcessing`. Double-navigation is already blocked
        // synchronously inside performProcess, and dimming every button during navigation caused the
        // whole bar to flash.
        disabled: getNavigationIsPrevented(pageId),
      }))}
      currentPageId={currentPageId}
      compact={isCompact}
      compactMenuOpen={showMenu}
      onOpenCompactMenu={() => setShowMenu(true)}
      loadingPageId={currentProcessKey ?? undefined}
      onNavigate={handleNavigationClick}
    />
  );
}
