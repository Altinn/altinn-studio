import { createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import * as React from 'react';
import { Route } from 'react-router-dom';
import AltinnAppTheme from 'Shared/theme/altinnAppTheme';
import FormFiller from './features/form/containers';
import Instantiate from './features/instantiate/containers';
import { ServiceInfo } from './features/serviceInfo/containers';
import TextResourcesActions from './shared/resources/textResources/actions';

const theme = createMuiTheme(AltinnAppTheme);

export default function() {

  React.useEffect(() => {
    TextResourcesActions.fetchTextResources();
  });

  return (
    <MuiThemeProvider theme={theme}>
      <Route path={'/'} exact={true} component={ServiceInfo} />
      <Route path={'/instantiate'} exact={true} component={Instantiate} />
      <Route path={'/instance/:partyId/:instanceGuid'} component={FormFiller} />
    </MuiThemeProvider>
  );
}
