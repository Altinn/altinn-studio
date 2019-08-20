import { createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import * as React from 'react';
import { Route } from 'react-router-dom';
import AltinnAppTheme from 'Shared/theme/altinnAppTheme';
import FormFiller from './features/form/containers';
import Instantiate from './features/instantiate/containers';
import PartySelection from './features/instantiate/containers/PartySelection';
import StatefullAltinnError from './shared/container/StatefullAltinnError';
import ApplicationMetadataActions from './shared/resources/applicationMetadata/actions';
import LanguageActions from './shared/resources/language/languageActions';
import PartyActions from './shared/resources/party/partyActions';
import ProfileActions from './shared/resources/profile/profileActions';
import TextResourcesActions from './shared/resources/textResources/actions';

import {
  languageUrl,
  profileApiUrl,
} from './utils/urlHelper';

const theme = createMuiTheme(AltinnAppTheme);

export default function() {

  React.useEffect(() => {
    TextResourcesActions.fetchTextResources();
    ProfileActions.fetchProfile(profileApiUrl);
    LanguageActions.fetchLanguage(languageUrl, 'nb');
    ApplicationMetadataActions.getApplicationMetadata();
    PartyActions.getParties();
  });

  return (
    <MuiThemeProvider theme={theme}>
      <Route path={'/'} exact={true} component={Instantiate} />
      <Route path={'/partyselection'} exact={true} component={PartySelection} />
      <Route path={'/instance/:partyId/:instanceGuid'} component={FormFiller} />
      <Route path={'/error'} component={StatefullAltinnError} />
    </MuiThemeProvider>
  );
}
