import * as React from 'react';
import { AltinnButton } from 'altinn-shared/components';
import { Grid, makeStyles } from '@material-ui/core';
import { useSelector } from 'react-redux';
import { IRuntimeState } from 'src/types';
import FormLayoutActions from '../../features/form/layout/formLayoutActions';

const useStyles = makeStyles({
  root: {
    paddingTop: '2.4em',
  },
});

export interface INavigationButtonsProps {
  next?: string;
  previous?: string;
}

export function NavigationButtons(props: INavigationButtonsProps) {
  const classes = useStyles();
  const { next, previous } = props;
  const [disableBack, setDisableBack] = React.useState<boolean>(false);
  const [disableNext, setDisableNext] = React.useState<boolean>(false);
  const currentView = useSelector((state: IRuntimeState) => state.formLayout.uiConfig.currentView);
  const orderedLayoutKeys = useSelector((state: IRuntimeState) => Object.keys(state.formLayout.layouts));

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
        <AltinnButton
          btnText='Tilbake'
          onClickFunction={onClickPrevious}
          disabled={disableBack}
        />
      </Grid>
      <Grid item={true} xs={2}>
        <AltinnButton
          btnText='Neste'
          onClickFunction={OnClickNext}
          disabled={disableNext}
        />
      </Grid>
    </Grid>
  );
}
