import { createMuiTheme, MuiThemeProvider } from '@material-ui/core';
import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import {AltinnAppTheme} from 'altinn-shared/theme';
import ProcessStepWrapper from './shared/containers/ProcessStepWrapper';
import Instantiate from './features/instantiate/containers';
import UnknownError from './features/instantiate/containers/UnknownError';
import PartySelection from './features/instantiate/containers/PartySelection';
import QueueActions from './shared/resources/queue/queueActions';
import { get } from './utils/networking';
import { getEnvironmentLoginUrl, refreshJwtTokenUrl } from './utils/urlHelper';
import { useSelector } from 'react-redux';
import { IRuntimeState } from './types';

const theme = createMuiTheme(AltinnAppTheme);

// 1 minute = 60.000ms
const TEN_MINUTE_IN_MILLISECONDS: number = 60000 * 10;

export default function() {
  const appTaskError: any = useSelector((state: IRuntimeState) => state.queue.appTask.error);

  let lastRefreshTokenTimestamp: number = 0;

  function setUpEventListeners() {
    window.addEventListener('mousemove', refreshJwtToken);
    window.addEventListener('scroll', refreshJwtToken);
    window.addEventListener('onfocus', refreshJwtToken);
    window.addEventListener('keydown', refreshJwtToken);
  }

  function removeEventListeners() {
    window.removeEventListener('mousemove', refreshJwtToken);
    window.removeEventListener('scroll', refreshJwtToken);
    window.removeEventListener('onfocus', refreshJwtToken);
    window.removeEventListener('keydown', refreshJwtToken);
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
    refreshJwtToken();
    QueueActions.startInitialAppTaskQueue();
    setUpEventListeners();
    return function cleanup() {
     removeEventListeners();
    };
  }, []);

  if (appTaskError) {
    return <UnknownError />
  }

  return (
    <MuiThemeProvider theme={theme}>
      <Switch>
        <Route path={'/'} exact={true} component={Instantiate} />
        <Route path={'/partyselection/:errorCode?'} exact={true} component={PartySelection} />
        <Route path={'/instance/:partyId/:instanceGuid'} exact={true} component={ProcessStepWrapper} />
      </Switch>
    </MuiThemeProvider>
  );
}
