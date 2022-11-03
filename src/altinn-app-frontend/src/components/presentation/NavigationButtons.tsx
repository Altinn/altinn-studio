import * as React from 'react';

import { Grid } from '@material-ui/core';

import type { PropsFromGenericComponent } from '..';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { selectLayoutOrder } from 'src/selectors/getLayoutOrder';
import { Triggers } from 'src/types';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { IKeepComponentScrollPos } from 'src/features/form/layout/formLayoutTypes';
import type { ILayoutNavigation, INavigationConfig } from 'src/types';

import { AltinnButton } from 'altinn-shared/components';

export type INavigationButtons = PropsFromGenericComponent<'NavigationButtons'>;

export function NavigationButtons(props: INavigationButtons) {
  const dispatch = useAppDispatch();

  const refPrev = React.useRef<HTMLButtonElement>();
  const refNext = React.useRef<HTMLButtonElement>();

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
  const triggers = props.triggers || pageTriggers;
  const nextTextKey = returnToView ? 'form_filler.back_to_summary' : props.textResourceBindings?.next || 'next';
  const backTextKey = props.textResourceBindings?.back || 'back';

  React.useEffect(() => {
    const currentViewIndex = orderedLayoutKeys?.indexOf(currentView);
    setDisableBack(!!returnToView || (!previous && currentViewIndex === 0));
    setDisableNext(!returnToView && !next && currentViewIndex === (orderedLayoutKeys?.length || 0) - 1);
  }, [currentView, orderedLayoutKeys, next, previous, returnToView]);

  const onClickPrevious = () => {
    const goToView = previous || (orderedLayoutKeys && orderedLayoutKeys[orderedLayoutKeys.indexOf(currentView) - 1]);
    if (goToView) {
      dispatch(FormLayoutActions.updateCurrentView({ newView: goToView }));
    }
  };

  const getScrollPosition = React.useCallback(() => {
    return (refNext.current || refPrev.current)?.getClientRects().item(0)?.y;
  }, []);

  const OnClickNext = () => {
    const runPageValidations = !returnToView && triggers?.includes(Triggers.ValidatePage);
    const runAllValidations = returnToView || triggers?.includes(Triggers.ValidateAllPages);
    const runValidations = (runAllValidations && 'allPages') || (runPageValidations && 'page') || undefined;
    const keepScrollPosAction: IKeepComponentScrollPos = {
      componentId: props.id,
      offsetTop: getScrollPosition(),
    };

    if (triggers?.includes(Triggers.CalculatePageOrder)) {
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
    if (!keepScrollPos || typeof keepScrollPos.offsetTop !== 'number' || keepScrollPos.componentId !== props.id) {
      return;
    }

    const currentPos = getScrollPosition();
    if (typeof currentPos !== 'number') {
      return;
    }

    window.scrollBy({ top: currentPos - keepScrollPos.offsetTop });
    dispatch(FormLayoutActions.clearKeepScrollPos());
  }, [keepScrollPos, dispatch, props.id, getScrollPosition]);

  if (!language) {
    return null;
  }

  return (
    <Grid
      data-testid='NavigationButtons'
      container
      spacing={1}
    >
      {!disableBack && props.showBackButton && (
        <Grid item>
          <AltinnButton
            ref={refPrev}
            btnText={getTextFromAppOrDefault(backTextKey, textResources, language, undefined, true)}
            onClickFunction={onClickPrevious}
            disabled={disableBack}
          />
        </Grid>
      )}
      {!disableNext && (
        <Grid item>
          <AltinnButton
            ref={refNext}
            btnText={getTextFromAppOrDefault(nextTextKey, textResources, language, undefined, true)}
            onClickFunction={OnClickNext}
            disabled={disableNext}
          />
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
