import { createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import AltinnAppTheme from '../../shared/src/theme/altinnAppTheme';
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
  getEnvironmentLoginUrl,
  languageUrl,
  profileApiUrl,
  refreshJwtTokenUrl,
} from './utils/urlHelper';

const theme = createMuiTheme(AltinnAppTheme);

// 1 minute = 60.000ms
const TEN_MINUTE_IN_MILLISECONDS: number = 60000 * 10;

export default function() {
  let lastRefreshTokenTimestamp: number = 0;

  function setUpEventListeners() {
    window.addEventListener('mousemove', refreshJwtToken);
    window.addEventListener('scroll', refreshJwtToken);
    window.addEventListener('onfocus', refreshJwtToken);
  }

  function removeEventListeners() {
    window.removeEventListener('mousemove', refreshJwtToken);
    window.removeEventListener('scroll', refreshJwtToken);
    window.removeEventListener('onfocus', refreshJwtToken);
  }

  function refreshJwtToken() {
    const timeNow = Date.now();
    if ((timeNow - lastRefreshTokenTimestamp) > TEN_MINUTE_IN_MILLISECONDS) {
      lastRefreshTokenTimestamp = timeNow;
      get(refreshJwtTokenUrl)
      .catch((err) => {
        // Most likely the user has an expired token, so we redirect to the login-page
        try {
          window.location.href = getEnvironmentLoginUrl();
        } catch (error) {
          console.error(err, error);
        }
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
    return function cleanup() {
     removeEventListeners();
    };
  }, []);

  return (
    <MuiThemeProvider theme={theme}>
      <Switch>
        <Route path={'/'} exact={true} component={Instantiate} />
        <Route path={'/partyselection/:errorCode?'} exact={true} component={PartySelection} />
        <Route path={'/instance/:partyId/:instanceGuid'} exact={true} component={FormFiller} />
        <Route path={'/error'} component={StatefullAltinnError} />
      </Switch>
    </MuiThemeProvider>
  );
}
