/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
import * as React from 'react';
import { AltinnButton } from 'altinn-shared/components';
import { Grid, makeStyles } from '@material-ui/core';
import { useDispatch, useSelector } from 'react-redux';
import { IRuntimeState, INavigationConfig, ILayoutNavigation, Triggers } from 'src/types';
import classNames from 'classnames';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';

const useStyles = makeStyles({
  backButton: {
    marginRight: '1.2em',
  },
});

export interface INavigationButtons {
  id: string;
  showBackButton: boolean;
  textResourceBindings: any;
  triggers?: Triggers[];
}

export function NavigationButtons(props: INavigationButtons) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const [disableBack, setDisableBack] = React.useState<boolean>(false);
  const [disableNext, setDisableNext] = React.useState<boolean>(false);
  const currentView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const orderedLayoutKeys = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.layoutOrder);
  const returnToView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.returnToView);
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const pageTriggers = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.pageTriggers);
  const { next, previous } = useSelector(
    (state: IRuntimeState) => getNavigationConfigForCurrentView(
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
    setDisableNext(!returnToView && !next && currentViewIndex === orderedLayoutKeys.length - 1);
  }, [currentView, orderedLayoutKeys]);

  const onClickPrevious = () => {
    const goToView = previous || orderedLayoutKeys[orderedLayoutKeys.indexOf(currentView) - 1];
    if (goToView) {
      dispatch(FormLayoutActions.updateCurrentView({ newView: goToView }));
    }
  };

  const OnClickNext = () => {
    const runPageValidations = !returnToView && triggers?.includes(Triggers.ValidatePage);
    const runAllValidations = returnToView || triggers?.includes(Triggers.ValidateAllPages);
    const runValidations = (runAllValidations && 'allPages') || (runPageValidations && 'page') || null;
    if (triggers?.includes(Triggers.CalculatePageOrder)) {
      dispatch(FormLayoutActions.calculatePageOrderAndMoveToNextPage({ runValidations }));
    } else {
      const goToView = returnToView || next || orderedLayoutKeys[orderedLayoutKeys.indexOf(currentView) + 1];
      if (goToView) {
        dispatch(FormLayoutActions.updateCurrentView({ newView: goToView, runValidations }));
      }
    }
  };

  return (
    <Grid
      container={true}
      justifyContent='space-between'
    >
      <Grid item={true} xs={12}>
        {!disableBack && props.showBackButton &&
          <AltinnButton
            btnText={getTextFromAppOrDefault(backTextKey, textResources, language, null, true)}
            onClickFunction={onClickPrevious}
            disabled={disableBack}
            className={classNames(classes.backButton)}
          />
        }
        {!disableNext &&
          <AltinnButton
            btnText={getTextFromAppOrDefault(nextTextKey, textResources, language, null, true)}
            onClickFunction={OnClickNext}
            disabled={disableNext}
          />
        }
      </Grid>
    </Grid>
  );
}

function getNavigationConfigForCurrentView(
  navigationConfig: INavigationConfig,
  currentView: string,
): ILayoutNavigation {
  if (navigationConfig && navigationConfig[currentView]) {
    return navigationConfig[currentView];
  }
  return {};
}
