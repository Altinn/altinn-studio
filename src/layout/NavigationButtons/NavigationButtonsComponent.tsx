import React from 'react';

import { Button } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { selectLayoutOrder } from 'src/selectors/getLayoutOrder';
import { reducePageValidations, Triggers } from 'src/types';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IKeepComponentScrollPos } from 'src/features/form/layout/formLayoutTypes';
import type { PropsFromGenericComponent } from 'src/layout';
import type { ILayoutNavigation, INavigationConfig } from 'src/types';

export type INavigationButtons = PropsFromGenericComponent<'NavigationButtons'>;

export function NavigationButtonsComponent({ node }: INavigationButtons) {
  const { id, showBackButton, textResourceBindings, triggers } = node.item;
  const dispatch = useAppDispatch();

  const refPrev = React.useRef<HTMLButtonElement>(null);
  const refNext = React.useRef<HTMLButtonElement>(null);

  const keepScrollPos = useAppSelector((state) => state.formLayout.uiConfig.keepScrollPos);

  const [disableBack, setDisableBack] = React.useState<boolean>(false);
  const [disableNext, setDisableNext] = React.useState<boolean>(false);
  const currentView = useAppSelector((state) => state.formLayout.uiConfig.currentView);
  const orderedLayoutKeys = useAppSelector(selectLayoutOrder);
  const returnToView = useAppSelector((state) => state.formLayout.uiConfig.returnToView);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const language = useAppSelector((state) => state.language.language);
  const pageTriggers = useAppSelector((state) => state.formLayout.uiConfig.pageTriggers);
  const { next, previous } = useAppSelector((state) =>
    getNavigationConfigForCurrentView(
      state.formLayout.uiConfig.navigationConfig,
      state.formLayout.uiConfig.currentView,
    ),
  );
  const activeTriggers = triggers || pageTriggers;
  const nextTextKey = returnToView ? 'form_filler.back_to_summary' : textResourceBindings?.next || 'next';
  const backTextKey = textResourceBindings?.back || 'back';

  React.useEffect(() => {
    const currentViewIndex = orderedLayoutKeys?.indexOf(currentView);
    setDisableBack(!!returnToView || (!previous && currentViewIndex === 0));
    setDisableNext(!returnToView && !next && currentViewIndex === (orderedLayoutKeys?.length || 0) - 1);
  }, [currentView, orderedLayoutKeys, next, previous, returnToView]);

  const onClickPrevious = () => {
    const goToView = previous || (orderedLayoutKeys && orderedLayoutKeys[orderedLayoutKeys.indexOf(currentView) - 1]);
    if (goToView) {
      dispatch(
        FormLayoutActions.updateCurrentView({
          newView: goToView,
        }),
      );
    }
  };

  const getScrollPosition = React.useCallback(() => {
    return (refNext.current || refPrev.current)?.getClientRects().item(0)?.y;
  }, []);

  const OnClickNext = () => {
    const runValidations = reducePageValidations(activeTriggers);
    const keepScrollPosAction: IKeepComponentScrollPos = {
      componentId: id,
      offsetTop: getScrollPosition(),
    };

    if (activeTriggers?.includes(Triggers.CalculatePageOrder)) {
      dispatch(
        FormLayoutActions.calculatePageOrderAndMoveToNextPage({
          runValidations,
          keepScrollPos: keepScrollPosAction,
        }),
      );
    } else {
      const goToView =
        returnToView || next || (orderedLayoutKeys && orderedLayoutKeys[orderedLayoutKeys.indexOf(currentView) + 1]);
      if (goToView) {
        dispatch(
          FormLayoutActions.updateCurrentView({
            newView: goToView,
            runValidations,
            keepScrollPos: keepScrollPosAction,
          }),
        );
      }
    }
  };

  React.useLayoutEffect(() => {
    if (!keepScrollPos || typeof keepScrollPos.offsetTop !== 'number' || keepScrollPos.componentId !== id) {
      return;
    }

    const currentPos = getScrollPosition();
    if (typeof currentPos !== 'number') {
      return;
    }

    window.scrollBy({ top: currentPos - keepScrollPos.offsetTop });
    dispatch(FormLayoutActions.clearKeepScrollPos());
  }, [keepScrollPos, dispatch, id, getScrollPosition]);

  if (!language) {
    return null;
  }

  return (
    <Grid
      data-testid='NavigationButtons'
      container
      spacing={1}
    >
      {!disableBack && showBackButton && (
        <Grid item>
          <Button
            ref={refPrev}
            onClick={onClickPrevious}
            disabled={disableBack}
          >
            {getTextFromAppOrDefault(backTextKey, textResources, language, undefined, true)}
          </Button>
        </Grid>
      )}
      {!disableNext && (
        <Grid item>
          <Button
            ref={refNext}
            onClick={OnClickNext}
            disabled={disableNext}
          >
            {getTextFromAppOrDefault(nextTextKey, textResources, language, undefined, true)}
          </Button>
        </Grid>
      )}
    </Grid>
  );
}

function getNavigationConfigForCurrentView(
  navigationConfig: INavigationConfig | undefined,
  currentView: string,
): ILayoutNavigation {
  const out = navigationConfig && navigationConfig[currentView];
  if (out) {
    return out;
  }

  return {};
}
