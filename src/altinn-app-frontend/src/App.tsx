import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import Entrypoint from 'src/features/entrypoint/Entrypoint';
import PartySelection from 'src/features/instantiate/containers/PartySelection';
import UnknownError from 'src/features/instantiate/containers/UnknownError';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { makeGetHasErrorsSelector } from 'src/selectors/getErrors';
import ProcessWrapper from 'src/shared/containers/ProcessWrapper';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import {
  getEnvironmentLoginUrl,
  refreshJwtTokenUrl,
} from 'src/utils/appUrlHelper';
import { get } from 'src/utils/networking';

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

  const allowAnonymousSelector = makeGetAllowAnonymousSelector();
  const allowAnonymous = useAppSelector(allowAnonymousSelector);

  const [ready, setReady] = React.useState(false);

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

    if (allowAnonymous !== undefined) {
      // Page is ready to be rendered once allowAnonymous value has been determined
      setReady(true);
    }

    if (allowAnonymous === false) {
      refreshJwtToken();
      dispatch(QueueActions.startInitialUserTaskQueue());
      setUpEventListeners();

      return () => {
        removeEventListeners();
      };
    }
  }, [allowAnonymous, dispatch, appOidcProvider]);

  React.useEffect(() => {
    dispatch(QueueActions.startInitialAppTaskQueue());
  }, [dispatch]);

  if (hasApiErrors) {
    return <UnknownError />;
  }

  if (!ready) {
    return null;
  }

  return (
    <Switch>
      <Route
        path='/'
        exact={true}
      >
        <Entrypoint allowAnonymous={allowAnonymous} />
      </Route>
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
  );
};
