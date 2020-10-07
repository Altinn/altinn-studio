import * as React from 'react';
import { AltinnButton } from 'altinn-shared/components';
import { Grid, makeStyles } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { IRuntimeState, INavigationConfig, ILayoutNavigation } from 'src/types';
import classNames from 'classnames';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import FormLayoutActions from '../../features/form/layout/formLayoutActions';

const useStyles = makeStyles({
  root: {
    paddingTop: '2.4em',
  },
  backButton: {
    marginRight: '1.2em',
  },
});

export interface INavigationButtons {
  id: string;
  showBackButton: boolean;
  textResourceBindings: any;
}

export function NavigationButtons(props: INavigationButtons) {
  const classes = useStyles();
  const [disableBack, setDisableBack] = React.useState<boolean>(false);
  const [disableNext, setDisableNext] = React.useState<boolean>(false);
  const currentView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const orderedLayoutKeys = useSelector((state: IRuntimeState) => Object.keys(state.formLayout.layouts));
  const textResources = useSelector((state: IRuntimeState) => state.textResources.resources);
  const language = useSelector((state: IRuntimeState) => state.language.language);
  const { next, previous } = useSelector(
    (state: IRuntimeState) => getNavigationConfigForCurrentView(
      state.formLayout.uiConfig.navigationConfig,
      state.formLayout.uiConfig.currentView,
    ),
  );

  const nextTextKey = props.textResourceBindings?.next || 'next';
  const backTextKey = props.textResourceBindings?.back || 'back';

  React.useEffect(() => {
    const currentViewIndex = orderedLayoutKeys.indexOf(currentView);
    setDisableBack(!previous && currentViewIndex === 0);
    setDisableNext(!next && currentViewIndex === orderedLayoutKeys.length - 1);
  }, [currentView, orderedLayoutKeys]);

  const onClickPrevious = () => {
    const goToView = previous || orderedLayoutKeys[orderedLayoutKeys.indexOf(currentView) - 1];
    if (goToView) {
      FormLayoutActions.updateCurrentView(goToView);
    }
  };

  const OnClickNext = () => {
    const goToView = next || orderedLayoutKeys[orderedLayoutKeys.indexOf(currentView) + 1];
    if (goToView) {
      FormLayoutActions.updateCurrentView(goToView);
    }
  };

  return (
    <Grid
      container={true}
      justify='space-between'
      className={classes.root}
    >
      <Grid item={true} xs={10}>
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
