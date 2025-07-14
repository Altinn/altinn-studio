import React from 'react';

import { Button } from 'src/app-components/Button/Button';
import { useIsProcessing } from 'src/core/contexts/processingContext';
import { useResetScrollPosition } from 'src/core/ui/useResetScrollPosition';
import { useHasPendingAttachments } from 'src/features/attachments/hooks';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useReturnToView, useSummaryNodeIdOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useNavigatePage, useNextPageKey, usePreviousPageKey } from 'src/hooks/useNavigatePage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/NavigationButtons/NavigationButtonsComponent.module.css';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import { splitDashedKey } from 'src/utils/splitDashedKey';
import type { PropsFromGenericComponent } from 'src/layout';

type Props = Pick<PropsFromGenericComponent<'NavigationButtons'>, 'baseComponentId'>;

export function NavigationButtonsComponent({ baseComponentId }: Props) {
  const summaryNodeId = useSummaryNodeIdOfOrigin();
  const { baseComponentId: summaryBaseComponentId } = splitDashedKey(summaryNodeId ?? '');
  const layoutLookups = useLayoutLookups();
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
  const { navigateToNextPage, navigateToPreviousPage, navigateToPage, maybeSaveOnPageChange } = useNavigatePage();
  const hasNext = !!useNextPageKey();
  const hasPrevious = !!usePreviousPageKey();
  const returnToView = useReturnToView();
  const { performProcess, isAnyProcessing, process } = useIsProcessing<'next' | 'previous' | 'backToSummary'>();

  const nextTextKey = textResourceBindings?.next || 'next';
  const backTextKey = textResourceBindings?.back || 'back';

  const showBackToSummaryButton = returnToView !== undefined;
  const showNextButton = showBackToSummaryButton ? showNextButtonSummary : hasNext;

  const onPageNavigationValidation = useOnPageNavigationValidation();
  const layoutLookups = useLayoutLookups();

  const attachmentsPending = useHasPendingAttachments();

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
      if (validateOnPrevious) {
        const pageKey = layoutLookups.componentToPage[baseComponentId];
        if (!pageKey) {
          throw new Error(`Could not find page key for component ${baseComponentId}`);
        }

        const hasErrors = await onPageNavigationValidation(pageKey, validateOnPrevious);
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
      if (validateOnNext && !returnToView) {
        const pageKey = layoutLookups.componentToPage[baseComponentId];
        if (!pageKey) {
          throw new Error(`Could not find page key for component ${baseComponentId}`);
        }
        const hasErrors = await onPageNavigationValidation(pageKey, validateOnNext);
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

  /**
   * The buttons are rendered in order BackToSummary -> Next -> Previous, but shown in the form as Previous -> Next -> BackToSummary.
   * This is done with css and flex-direction: row-reverse. The reason for this is so that screen readers
   * will read Next before Previous, as this is the primary Button for the user.
   */
  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <div
        data-testid='NavigationButtons'
        className={classes.container}
      >
        {showBackToSummaryButton && (
          <Button
            disabled={isAnyProcessing}
            isLoading={process === 'backToSummary'}
            onClick={onClickBackToSummary}
          >
            <Lang id={returnToViewText} />
          </Button>
        )}
        {showNextButton && (
          <Button
            disabled={isAnyProcessing || attachmentsPending}
            isLoading={process === 'next'}
            onClick={onClickNext}
            // If we are showing a back to summary button, we want the "next" button to be secondary
            variant={showBackToSummaryButton ? 'secondary' : 'primary'}
          >
            <Lang id={nextTextKey} />
          </Button>
        )}
        {hasPrevious && showBackButton && (
          <Button
            disabled={isAnyProcessing}
            isLoading={process === 'previous'}
            variant={showNextButton || showBackToSummaryButton ? 'secondary' : 'primary'}
            onClick={onClickPrevious}
          >
            <Lang id={backTextKey} />
          </Button>
        )}
      </div>
    </ComponentStructureWrapper>
  );
}
