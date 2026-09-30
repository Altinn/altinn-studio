import React from 'react';
import { useSearchParams } from 'react-router';

import { NavigationButtons } from '@app/form-component';

import { SearchParams } from 'src/core/routing/types';
import { useResetScrollPosition } from 'src/core/ui/useResetScrollPosition';
import { AttachmentReadModel } from 'src/features/attachments/hooks/attachmentReadModel';
import { FormStore } from 'src/features/form/FormContext';
import { useLanguage } from 'src/features/language/useLanguage';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useNavigatePage, useNextPageKey, usePreviousPageKey } from 'src/hooks/useNavigatePage';
import { usePageValidation } from 'src/hooks/usePageValidation';
import {
  useCurrentProcessKey,
  useIsAnyProcessing,
  useProcessingMutationWithKey,
} from 'src/hooks/useProcessingMutation';
import { smartLowerCaseFirst } from 'src/utils/formComponentUtils';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { NavigatePageProcessKey } from 'src/hooks/useProcessingMutation';
import type { PropsFromGenericComponent } from 'src/layout';

type Props = Pick<PropsFromGenericComponent<'NavigationButtons'>, 'baseComponentId'>;

export function NavigationButtonsComponent({ baseComponentId }: Props) {
  const summaryNodeId = FormStore.pageNavigation.useSummaryNodeIdOfOrigin();
  const { baseComponentId: summaryBaseComponentId } = splitDashedKey(summaryNodeId ?? '');
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const origin = summaryBaseComponentId ? layoutLookups.getComponent(summaryBaseComponentId) : undefined;

  // TODO: Support returning to Summary2
  if (origin && origin.type === 'Summary') {
    return (
      <WithSummary
        baseComponentId={baseComponentId}
        summaryBaseComponentId={summaryBaseComponentId}
      />
    );
  }

  return (
    <NavigationButtonsComponentInner
      baseComponentId={baseComponentId}
      returnToViewText='form_filler.back_to_summary'
      showNextButtonSummary={false}
    />
  );
}

function WithSummary({ baseComponentId, summaryBaseComponentId }: Props & { summaryBaseComponentId: string }) {
  const summaryItem = useItemWhenType(summaryBaseComponentId, 'Summary');
  const returnToViewText =
    summaryItem?.textResourceBindings?.returnToSummaryButtonTitle ?? 'form_filler.back_to_summary';
  const showNextButtonSummary = summaryItem?.display != null && summaryItem?.display?.nextButton === true;

  return (
    <NavigationButtonsComponentInner
      baseComponentId={baseComponentId}
      returnToViewText={returnToViewText}
      showNextButtonSummary={showNextButtonSummary}
    />
  );
}

function NavigationButtonsComponentInner({
  baseComponentId,
  returnToViewText,
  showNextButtonSummary,
}: Props & { returnToViewText: string; showNextButtonSummary: boolean }) {
  const { id, showBackButton, textResourceBindings, validateOnNext, validateOnPrevious } = useItemWhenType(
    baseComponentId,
    'NavigationButtons',
  );

  const { getPageValidation } = usePageValidation(baseComponentId);
  // Use component-level validation if set, otherwise fall back to page-level
  // When page-level validation is set, only validate forward navigation
  const validateOnForward = getPageValidation() ?? validateOnNext;
  const validateOnBackward = getPageValidation() ? undefined : validateOnPrevious;

  const { navigateToNextPage, navigateToPreviousPage, navigateToPage, maybeSaveOnPageChange } = useNavigatePage();
  const hasNext = !!useNextPageKey();
  const hasPrevious = !!usePreviousPageKey();
  const returnToView = FormStore.pageNavigation.useReturnToView();
  const { langAsString } = useLanguage();

  const [searchParams] = useSearchParams();
  const backToPage = searchParams.get(SearchParams.BackToPage);
  const showBackToPageButton = !!backToPage;

  const performProcess = useProcessingMutationWithKey<NavigatePageProcessKey>('navigate-page');
  const currentProcessKey = useCurrentProcessKey<NavigatePageProcessKey>('navigate-page');
  const isAnyProcessing = useIsAnyProcessing();

  const showBackToSummaryButton = returnToView !== undefined;
  const showNextButton = showBackToSummaryButton ? showNextButtonSummary : hasNext;

  const onPageNavigationValidation = useOnPageNavigationValidation();
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();

  const attachmentsPending = AttachmentReadModel.useHasPendingAttachments();

  const getScrollPosition = React.useCallback(
    () => document.querySelector(`[data-componentid="${id}"]`)?.getClientRects().item(0)?.y,
    [id],
  );

  /**
   * If validation fails the ErrorReport will move the buttons down.
   * This resets the scroll position so that the buttons are in the same place.
   */
  const resetScrollPosition = useResetScrollPosition(getScrollPosition, '[data-testid="ErrorReport"]');

  const onClickPrevious = () =>
    performProcess('previous', async () => {
      await maybeSaveOnPageChange();

      const prevScrollPosition = getScrollPosition();
      if (validateOnBackward) {
        const pageKey = layoutLookups.componentToPage[baseComponentId];
        if (!pageKey) {
          throw new Error(`Could not find page key for component ${baseComponentId}`);
        }

        const hasErrors = await onPageNavigationValidation(pageKey, validateOnBackward);
        if (hasErrors) {
          // Block navigation if validation fails
          resetScrollPosition(prevScrollPosition);
          return;
        }
      }

      await navigateToPreviousPage({ skipAutoSave: true });
    });

  const onClickNext = () =>
    performProcess('next', async () => {
      await maybeSaveOnPageChange();

      const prevScrollPosition = getScrollPosition();

      if (validateOnForward && !returnToView) {
        const pageKey = layoutLookups.componentToPage[baseComponentId];
        if (!pageKey) {
          throw new Error(`Could not find page key for component ${baseComponentId}`);
        }
        const hasErrors = await onPageNavigationValidation(pageKey, validateOnForward);
        if (hasErrors) {
          // Block navigation if validation fails, unless returnToView is set (Back to summary)
          resetScrollPosition(prevScrollPosition);
          return;
        }
      }

      await navigateToNextPage({ skipAutoSave: true });
    });

  const onClickBackToSummary = () =>
    performProcess('backToSummary', async () => {
      await maybeSaveOnPageChange();
      await navigateToPage(returnToView, { skipAutoSave: true });
    });

  const onClickBackToPage = () =>
    performProcess('backToPage', async () => {
      if (!backToPage) {
        return;
      }
      await maybeSaveOnPageChange();
      await navigateToPage(backToPage, { skipAutoSave: true });
    });

  const loadingKey =
    currentProcessKey === 'next' ||
    currentProcessKey === 'previous' ||
    currentProcessKey === 'backToSummary' ||
    currentProcessKey === 'backToPage'
      ? currentProcessKey
      : undefined;

  return (
    <NavigationButtons
      componentId={id}
      next={textResourceBindings?.next || undefined}
      back={textResourceBindings?.back || undefined}
      backToSummary={returnToViewText}
      backToPage={textResourceBindings?.backToPage || undefined}
      backToPageParams={[smartLowerCaseFirst(langAsString(backToPage ?? ''))]}
      showNext={showNextButton}
      showPrevious={hasPrevious && showBackButton !== false}
      showBackToSummary={showBackToSummaryButton}
      showBackToPage={showBackToPageButton}
      disabled={isAnyProcessing}
      nextDisabled={attachmentsPending}
      loadingKey={loadingKey}
      onClickNext={onClickNext}
      onClickPrevious={onClickPrevious}
      onClickBackToSummary={onClickBackToSummary}
      onClickBackToPage={onClickBackToPage}
    />
  );
}
