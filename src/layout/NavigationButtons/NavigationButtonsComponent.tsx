import React from 'react';

import { Button } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';

import { usePageNavigationContext } from 'src/features/form/layout/PageNavigationContext';
import { useLayoutSettings } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { Lang } from 'src/features/language/Lang';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useNavigatePage } from 'src/hooks/useNavigatePage';
import classes from 'src/layout/NavigationButtons/NavigationButtonsComponent.module.css';
import { reducePageValidations } from 'src/types';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { PropsFromGenericComponent } from 'src/layout';
export type INavigationButtons = PropsFromGenericComponent<'NavigationButtons'>;

export function NavigationButtonsComponent({ node }: INavigationButtons) {
  const { id, showBackButton, textResourceBindings, triggers } = node.item;
  const dispatch = useAppDispatch();
  const { navigateToPage, next, previous } = useNavigatePage();
  const { returnToView, setReturnToView, scrollPosition, setScrollPosition } = usePageNavigationContext();

  const refPrev = React.useRef<HTMLButtonElement>(null);
  const refNext = React.useRef<HTMLButtonElement>(null);

  const pageTriggers = useLayoutSettings().pages.triggers;
  const activeTriggers = triggers || pageTriggers;
  const nextTextKey = returnToView ? 'form_filler.back_to_summary' : textResourceBindings?.next || 'next';
  const backTextKey = textResourceBindings?.back || 'back';

  const parentIsPage = node.parent instanceof LayoutPage;

  const disablePrevious = previous === undefined;
  const disableNext = next === undefined;

  const onClickPrevious = () => {
    if (previous && !disablePrevious) {
      navigateToPage(previous);
    }
  };

  const getScrollPosition = React.useCallback(
    () => (refNext.current || refPrev.current)?.getClientRects().item(0)?.y,
    [],
  );

  const OnClickNext = () => {
    // eslint-disable-next-line unused-imports/no-unused-vars
    const runValidations = reducePageValidations(activeTriggers);
    const goToView = returnToView || next;

    if (!(goToView && !disableNext)) {
      return;
    }
    // const keepScrollPosAction: IComponentScrollPos = {
    //   componentId: id,
    //   offsetTop: getScrollPosition(),
    // };

    /**
     * TODO(1508): set this only if there are validation messages
     */
    // setScrollPosition(keepScrollPosAction);
    setReturnToView(undefined);
    navigateToPage(goToView);
  };

  React.useLayoutEffect(() => {
    if (!scrollPosition || typeof scrollPosition.offsetTop !== 'number' || scrollPosition.componentId !== id) {
      return;
    }

    const currentPos = getScrollPosition();
    if (typeof currentPos !== 'number') {
      return;
    }

    window.scrollBy({ top: currentPos - scrollPosition.offsetTop });
    setScrollPosition(undefined);
  }, [scrollPosition, dispatch, id, getScrollPosition, setScrollPosition]);

  return (
    <div
      data-testid='NavigationButtons'
      className={classes.container}
      style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
    >
      {!disablePrevious && showBackButton && (
        <Grid item>
          <Button
            ref={refPrev}
            size='small'
            onClick={onClickPrevious}
            disabled={disablePrevious}
          >
            <Lang id={backTextKey} />
          </Button>
        </Grid>
      )}
      {!disableNext && (
        <Grid item>
          <Button
            ref={refNext}
            size='small'
            onClick={OnClickNext}
            disabled={disableNext}
          >
            <Lang id={nextTextKey} />
          </Button>
        </Grid>
      )}
    </div>
  );
}
