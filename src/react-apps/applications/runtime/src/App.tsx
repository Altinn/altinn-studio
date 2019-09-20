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
import { get } from './utils/networking';
import {
  languageUrl,
  profileApiUrl,
  refreshJwtTokenUrl,
} from './utils/urlHelper';

const theme = createMuiTheme(AltinnAppTheme);

export default function() {
  const [refreshTimestamp, setRefreshTimestamp] = React.useState<number>(Date.now());

  function setUpEventListeners() {
    window.addEventListener('mousemove', refreshJwtToken);
    window.addEventListener('scroll', refreshJwtToken);
    window.addEventListener('onfocus', refreshJwtToken);
  }

  function refreshJwtToken(event: MouseEvent | null) {
    console.log('Maybe update token?', (Date.now() - refreshTimestamp) > 60000);
    if ((Date.now() - refreshTimestamp) > 60000) {
      get(refreshJwtTokenUrl)
      .then(() => {
        console.log('token refreshed');
        setRefreshTimestamp(Date.now());
      })
      .catch((err) => {
        console.error('token not refreshed', err);
        setRefreshTimestamp(Date.now());
      });
    }
  }

  React.useEffect(() => {
    TextResourcesActions.fetchTextResources();
    ProfileActions.fetchProfile(profileApiUrl);
    LanguageActions.fetchLanguage(languageUrl, 'nb');
    ApplicationMetadataActions.getApplicationMetadata();
    PartyActions.getParties();
    setUpEventListeners();
  }, []);

  return (
    <MuiThemeProvider theme={theme}>
      <Route path={'/'} exact={true} component={Instantiate} />
      <Route path={'/partyselection'} exact={true} component={PartySelection} />
      <Route path={'/instance/:partyId/:instanceGuid'} component={FormFiller} />
      <Route path={'/error'} component={StatefullAltinnError} />
    </MuiThemeProvider>
  );
}
