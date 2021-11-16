import { createTheme, MuiThemeProvider } from '@material-ui/core';
import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { useSelector, useDispatch } from 'react-redux';
import ProcessWrapper from './shared/containers/ProcessWrapper';
import UnknownError from './features/instantiate/containers/UnknownError';
import PartySelection from './features/instantiate/containers/PartySelection';
import { startInitialAppTaskQueue } from './shared/resources/queue/queueSlice';
import { get } from './utils/networking';
import { getEnvironmentLoginUrl, refreshJwtTokenUrl } from './utils/urlHelper';
import { makeGetHasErrorsSelector } from './selectors/getErrors';
import Entrypoint from './features/entrypoint/Entrypoint';

const theme = createTheme(AltinnAppTheme);

// 1 minute = 60.000ms
const TEN_MINUTE_IN_MILLISECONDS: number = 60000 * 10;

export default function setup() {
  const dispatch = useDispatch();
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors: boolean = useSelector(hasErrorSelector);
  // @ts-ignore since appliacationSetting is not available in rootstate
  const appOidcProvider = useSelector((state) => state.applicationSettings?.applicationSettings?.appOidcProvider);

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
            window.location.href = getEnvironmentLoginUrl(appOidcProvider);
          } catch (error) {
            console.error(err, error);
          }
        });
    }
  }

  React.useEffect(() => {
    refreshJwtToken();
    dispatch(startInitialAppTaskQueue());
    setUpEventListeners();
    return function cleanup() {
      removeEventListeners();
    };
  }, [appOidcProvider]);

  if (hasApiErrors) {
    return <UnknownError />;
  }

  return (
    <MuiThemeProvider theme={theme}>
      <Switch>
        <Route
          path='/'
          exact={true}
          component={Entrypoint}
        />
        <Route
          path='/partyselection/:errorCode?'
          exact={true}
          component={PartySelection}
        />
        <Route
          path='/instance/:partyId/:instanceGuid'
          exact={true}
          component={ProcessWrapper}
        />
      </Switch>
    </MuiThemeProvider>
  );
}
