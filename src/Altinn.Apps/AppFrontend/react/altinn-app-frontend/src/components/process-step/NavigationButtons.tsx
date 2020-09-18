import * as React from 'react';
import { AltinnButton } from 'altinn-shared/components';
import { Grid } from '@material-ui/core';
import FormLayoutActions from '../../features/form/layout/formLayoutActions';

export function NavigationButtons() {
  const onClickBack = () => {
    FormLayoutActions.updateCurrentView('FormLayout');
  };

  const OnClickNext = () => {
    FormLayoutActions.updateCurrentView('sometest');
  };

  return (
    <Grid container={true} justify='space-between'>
      <Grid item={true} xs={6}>
        <AltinnButton
          btnText='Tilbake'
          onClickFunction={onClickBack}
        />
      </Grid>
      <Grid item={true} xs={6}>
        <AltinnButton
          btnText='Neste'
          onClickFunction={OnClickNext}
        />
      </Grid>
    </Grid>
  );
}
