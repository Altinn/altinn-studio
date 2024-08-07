import React from 'react';

import { Button } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { useReturnToView, useSummaryNodeOfOrigin } from 'src/features/form/layout/PageNavigationContext';
import { Lang } from 'src/features/language/Lang';
import { useOnPageNavigationValidation } from 'src/features/validation/callbacks/onPageNavigationValidation';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import classes from 'src/layout/NavigationButtons/NavigationButtonsComponent.module.css';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
export type INavigationButtons = PropsFromGenericComponent<'NavigationButtons'>;

export function NavigationButtonsComponent({ node }: INavigationButtons) {
  const { id, showBackButton, textResourceBindings, validateOnNext, validateOnPrevious } = node.item;
  const { navigateToPage, next, previous, maybeSaveOnPageChange } = useNavigatePage();
  const returnToView = useReturnToView();
  const summaryItem = useSummaryNodeOfOrigin()?.item;

  const parentIsPage = node.parent instanceof LayoutPage;

  const refPrev = React.useRef<HTMLButtonElement>(null);
  const refNext = React.useRef<HTMLButtonElement>(null);

  const nextTextKey = textResourceBindings?.next || 'next';
  const backTextKey = textResourceBindings?.back || 'back';
  const returnToViewText =
    summaryItem?.textResourceBindings?.returnToSummaryButtonTitle ?? 'form_filler.back_to_summary';

  const disablePrevious = previous === undefined;
  const disableNext = next === undefined;

  const showBackToSummaryButton = returnToView !== undefined;
  const showNextButtonSummary = summaryItem?.display != null && summaryItem?.display?.nextButton === true;
  const showNextButton = showBackToSummaryButton ? showNextButtonSummary : !disableNext;

  const onPageNavigationValidation = useOnPageNavigationValidation();

  const getScrollPosition = React.useCallback(
    () => document.querySelector(`[data-componentid="${id}"]`)?.getClientRects().item(0)?.y,
    [id],
  );

  /**
   * If validation fails the ErrorReport will move the buttons down.
   * This resets the scroll position so that the buttons are in the same place.
   */
  const resetScrollPosition = (prevScrollPosition: number | undefined) => {
    if (prevScrollPosition === undefined) {
      return;
    }
    let attemptsLeft = 10;
    const check = () => {
      attemptsLeft--;
      if (attemptsLeft <= 0) {
        return;
      }
      const newScrollPosition = getScrollPosition();
      if (newScrollPosition !== undefined && newScrollPosition !== prevScrollPosition) {
        window.scrollBy({ top: newScrollPosition - prevScrollPosition });
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  };

  const onClickPrevious = async () => {
    if (!previous || disablePrevious) {
      return;
    }

    maybeSaveOnPageChange();

    const prevScrollPosition = getScrollPosition();
    if (validateOnPrevious) {
      const hasError = await onPageNavigationValidation(node.top, validateOnPrevious);
      if (hasError) {
        // Block navigation if validation fails
        resetScrollPosition(prevScrollPosition);
        return;
      }
    }

    navigateToPage(previous, { skipAutoSave: true });
  };

  const onClickNext = async () => {
    if (!next || disableNext) {
      return;
    }

    maybeSaveOnPageChange();

    const prevScrollPosition = getScrollPosition();
    if (validateOnNext && !returnToView) {
      const hasErrors = await onPageNavigationValidation(node.top, validateOnNext);
      if (hasErrors) {
        // Block navigation if validation fails, unless returnToView is set (Back to summary)
        resetScrollPosition(prevScrollPosition);
        return;
      }
    }

    navigateToPage(next, { skipAutoSave: true });
  };

  const onClickBackToSummary = () => {
    if (!returnToView) {
      return;
    }

    maybeSaveOnPageChange();
    navigateToPage(returnToView, { skipAutoSave: true });
  };

  /**
   * The buttons are rendered in order BackToSummary -> Next -> Previous, but shown in the form as Previous -> Next -> BackToSummary.
   * This is done with css and flex-direction: row-reverse. The reason for this is so that screen readers
   * will read Next before Previous, as this is the primary Button for the user.
   */
  return (
    <ComponentStructureWrapper node={node}>
      <div
        data-testid='NavigationButtons'
        className={classes.container}
        style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
      >
        {showBackToSummaryButton && (
          <Grid item>
            <Button
              ref={refNext}
              size='small'
              onClick={onClickBackToSummary}
            >
              <Lang id={returnToViewText} />
            </Button>
          </Grid>
        )}
        {showNextButton && (
          <Grid item>
            <Button
              ref={refNext}
              size='small'
              onClick={onClickNext}
              // If we are showing a back to summary button, we want the "next" button to be secondary
              variant={showBackToSummaryButton ? 'secondary' : 'primary'}
            >
              <Lang id={nextTextKey} />
            </Button>
          </Grid>
        )}
        {!disablePrevious && showBackButton && (
          <Grid item>
            <Button
              ref={refPrev}
              size='small'
              variant={showNextButton || showBackToSummaryButton ? 'secondary' : 'primary'}
              onClick={onClickPrevious}
            >
              <Lang id={backTextKey} />
            </Button>
          </Grid>
        )}
      </div>
    </ComponentStructureWrapper>
  );
}
