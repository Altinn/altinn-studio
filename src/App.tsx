import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { useAppDispatch } from 'src/common/hooks/useAppDispatch';
import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { PdfActions } from 'src/features/pdf/data/pdfSlice';
import { makeGetAllowAnonymousSelector } from 'src/selectors/getAllowAnonymous';
import { makeGetHasErrorsSelector } from 'src/selectors/getErrors';
import { selectAppName, selectAppOwner } from 'src/selectors/language';
import { ProcessWrapper } from 'src/shared/containers/ProcessWrapper';
import { QueueActions } from 'src/shared/resources/queue/queueSlice';
import { httpGet } from 'src/utils/network/networking';
import { shouldGeneratePdf } from 'src/utils/pdf';
import { getEnvironmentLoginUrl, refreshJwtTokenUrl } from 'src/utils/urls/appUrlHelper';

// 1 minute = 60.000ms
const TEN_MINUTE_IN_MILLISECONDS: number = 60000 * 10;

export const App = () => {
  const dispatch = useAppDispatch();
  const hasErrorSelector = makeGetHasErrorsSelector();
  const hasApiErrors: boolean = useAppSelector(hasErrorSelector);
  const appOidcProvider = useAppSelector((state) => state.applicationSettings?.applicationSettings?.appOidcProvider);
  const lastRefreshTokenTimestamp = React.useRef(0);

  const allowAnonymousSelector = makeGetAllowAnonymousSelector();
  const allowAnonymous = useAppSelector(allowAnonymousSelector);

  const appName = useAppSelector(selectAppName);
  const appOwner = useAppSelector(selectAppOwner);

  // Set the title of the app
  React.useEffect(() => {
    if (appName && appOwner) {
      document.title = `${appName} • ${appOwner}`;
    } else if (appName && !appOwner) {
      document.title = appName;
    } else if (!appName && appOwner) {
      document.title = appOwner;
    }
  }, [appOwner, appName]);

  React.useEffect(() => {
    function setUpEventListeners() {
      window.addEventListener('mousemove', refreshJwtToken);
      window.addEventListener('scroll', refreshJwtToken);
      window.addEventListener('onfocus', refreshJwtToken);
      window.addEventListener('keydown', refreshJwtToken);
      window.addEventListener('hashchange', setPdfState);
    }

    function removeEventListeners() {
      window.removeEventListener('mousemove', refreshJwtToken);
      window.removeEventListener('scroll', refreshJwtToken);
      window.removeEventListener('onfocus', refreshJwtToken);
      window.removeEventListener('keydown', refreshJwtToken);
      window.removeEventListener('hashchange', setPdfState);
    }

    function setPdfState() {
      if (shouldGeneratePdf()) {
        dispatch(PdfActions.pdfStateChanged());
      }
    }

    function refreshJwtToken() {
      const timeNow = Date.now();
      if (timeNow - lastRefreshTokenTimestamp.current > TEN_MINUTE_IN_MILLISECONDS) {
        lastRefreshTokenTimestamp.current = timeNow;
        httpGet(refreshJwtTokenUrl).catch((err) => {
          // Most likely the user has an expired token, so we redirect to the login-page
          try {
            window.location.href = getEnvironmentLoginUrl(appOidcProvider || null);
          } catch (error) {
            console.error(err, error);
          }
        });
      }
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

  // Page is ready to be rendered once allowAnonymous value has been determined
  const ready = allowAnonymous !== undefined;
  if (!ready) {
    return null;
  }
  return (
    <Routes>
      <Route
        path='/'
        element={<Entrypoint allowAnonymous={allowAnonymous} />}
      />
      <Route
        path='/partyselection/*'
        element={<PartySelection />}
      />
      <Route
        path='/instance/:partyId/:instanceGuid'
        element={<ProcessWrapper />}
      />
    </Routes>
  );
};
