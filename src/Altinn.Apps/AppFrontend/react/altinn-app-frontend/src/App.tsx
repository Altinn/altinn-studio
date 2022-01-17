import { createTheme, MuiThemeProvider } from '@material-ui/core';
import * as React from 'react';
import { Route, Switch } from 'react-router-dom';
import { AltinnAppTheme } from 'altinn-shared/theme';
import ProcessWrapper from './shared/containers/ProcessWrapper';
import UnknownError from './features/instantiate/containers/UnknownError';
import PartySelection from './features/instantiate/containers/PartySelection';
import { startInitialAppTaskQueue } from './shared/resources/queue/queueSlice';
import { get } from './utils/networking';
import { getEnvironmentLoginUrl, refreshJwtTokenUrl } from './utils/urlHelper';
import { makeGetHasErrorsSelector } from './selectors/getErrors';
import Entrypoint from './features/entrypoint/Entrypoint';
import { useAppDispatch, useAppSelector } from './common/hooks';

const theme = createTheme(AltinnAppTheme);

// 1 minute = 60.000ms
const TEN_MINUTE_IN_MILLISECONDS: number = 60000 * 10;

export const App = () => {
  const dispatch = useAppDispatch();
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors: boolean = useAppSelector(hasErrorSelector);
  const appOidcProvider = useAppSelector(
    (state) => state.applicationSettings?.applicationSettings?.appOidcProvider,
  );

  const lastRefreshTokenTimestamp = React.useRef(0);

  React.useEffect(() => {
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
      if (
        timeNow - lastRefreshTokenTimestamp.current >
        TEN_MINUTE_IN_MILLISECONDS
      ) {
        lastRefreshTokenTimestamp.current = timeNow;
        get(refreshJwtTokenUrl).catch((err) => {
          // Most likely the user has an expired token, so we redirect to the login-page
          try {
            window.location.href = getEnvironmentLoginUrl(appOidcProvider);
          } catch (error) {
            console.error(err, error);
          }
        });
      }
    }

    refreshJwtToken();
    dispatch(startInitialAppTaskQueue());
    setUpEventListeners();

    return () => {
      removeEventListeners();
    };
  }, [dispatch, appOidcProvider]);

  if (hasApiErrors) {
    return <UnknownError />;
  }

  return (
    <MuiThemeProvider theme={theme}>
      <Switch>
        <Route path='/' exact={true} component={Entrypoint} />
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
};
