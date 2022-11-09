import React, { useCallback, useEffect, useRef } from 'react';
import { createTheme, ThemeProvider } from '@mui/material';
import altinnTheme from 'app-shared/theme/altinnStudioTheme';
import postMessages from 'app-shared/utils/postMessages';
import AltinnPopoverSimple from 'app-shared/components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { HandleServiceInformationActions } from './features/administration/handleServiceInformationSlice';
import { fetchRepoStatus } from './features/handleMergeConflict/handleMergeConflictSlice';
import { makeGetRepoStatusSelector } from './features/handleMergeConflict/handleMergeConflictSelectors';
import { ApplicationMetadataActions } from './sharedResources/applicationMetadata/applicationMetadataSlice';
import { fetchLanguage } from './utils/fetchLanguage/languageSlice';
import { repoStatusUrl } from './utils/urlHelper';
import {
  fetchRemainingSession,
  keepAliveSession,
  signOutUser,
} from './sharedResources/user/userSlice';
import PageHeader from './layout/PageHeader';
import { useAppDispatch, useAppSelector } from 'common/hooks';

import './App.css';
import LeftMenu from './layout/LeftMenu';
import { matchPath, useLocation } from 'react-router-dom';

import classes from './App.module.css';

const theme = createTheme(altinnTheme);

const GetRepoStatusSelector = makeGetRepoStatusSelector();
const TEN_MINUTES_IN_MILLISECONDS = 600000;

export function App() {
  const { pathname } = useLocation();
  const match = matchPath(
    { path: '/:org/:app', caseSensitive: true, end: false },
    pathname,
  );
  const { org, app } = match.params;
  const language = useAppSelector((state) => state.languageState.language);
  const t = (key: string) => getLanguageFromKey(key, language);
  const repoStatus = useAppSelector(GetRepoStatusSelector);
  const remainingSessionMinutes = useAppSelector(
    (state) => state.userState.session.remainingMinutes,
  );
  const dispatch = useAppDispatch();
  const lastKeepAliveTimestamp = useRef<number>(0);
  const sessionExpiredPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(
      fetchLanguage({
        url: `${window.location.origin}/designer/frontend/lang/nb.json`,
      }),
    );
    dispatch(ApplicationMetadataActions.getApplicationMetadata());
    dispatch(DataModelsMetadataActions.getDataModelsMetadata());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchRemainingSession());
    if (app && org) {
      dispatch(
        HandleServiceInformationActions.fetchServiceName({
          url: `${window.location.origin}/designer/${org}/${app}/Text/GetServiceName`,
        }),
      );
      dispatch(
        HandleServiceInformationActions.fetchService({
          url: `${window.location.origin}/designer/api/v1/repos/${org}/${app}`,
        }),
      );
      dispatch(
        HandleServiceInformationActions.fetchInitialCommit({
          url: `${window.location.origin}/designer/api/v1/repos/${org}/${app}/initialcommit`,
        }),
      );
      dispatch(
        HandleServiceInformationActions.fetchServiceConfig({
          url: `${window.location.origin}/designer/${org}/${app}/Config/GetServiceConfig`,
        }),
      );
    }
  }, [app, dispatch, org]);

  useEffect(() => {
    const setEventListeners = (subscribe: boolean) => {
      const keepAliveListeners = ['mousemove', 'scroll', 'onfocus', 'keydown'];
      keepAliveListeners.forEach((listener) =>
        (subscribe ? window.addEventListener : window.removeEventListener)(
          listener,
          keepAliveSessionState,
        ),
      );
    };
    const windowEventReceived = (event: any) => {
      if (event.data === postMessages.forceRepoStatusCheck) {
        dispatch(
          fetchRepoStatus({
            url: repoStatusUrl,
            org,
            repo: app,
          }),
        );
      }
    };
    const keepAliveSessionState = () => {
      const timeNow = Date.now();
      if (
        remainingSessionMinutes > 10 &&
        remainingSessionMinutes <= 30 &&
        timeNow - lastKeepAliveTimestamp.current > TEN_MINUTES_IN_MILLISECONDS
      ) {
        lastKeepAliveTimestamp.current = timeNow;
        dispatch(keepAliveSession());
      }
    };

    setEventListeners(true);
    window.addEventListener('message', windowEventReceived);
    return function cleanup() {
      window.removeEventListener('message', windowEventReceived);
      setEventListeners(false);
    };
  }, [app, dispatch, lastKeepAliveTimestamp, org, remainingSessionMinutes]);

  const handleSessionExpiresClose = useCallback(
    (action: string) => {
      if (action === 'close') {
        // user clicked close button, sign user out
        dispatch(signOutUser());
      } else {
        // user clicked outside the popover or pressed "continue", keep signed in
        dispatch(keepAliveSession());
        lastKeepAliveTimestamp.current = Date.now();
      }
    },
    [dispatch],
  );

  return (
    <ThemeProvider theme={theme}>
      <div
        className={classes.container}
        ref={sessionExpiredPopoverRef}
      >
        <AltinnPopoverSimple
          testId='logout-warning'
          anchorEl={sessionExpiredPopoverRef.current}
          open={remainingSessionMinutes < 11}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          handleClose={(event: string) => handleSessionExpiresClose(event)}
          btnCancelText={t('general.sign_out')}
          btnConfirmText={t('general.continue')}
          btnClick={handleSessionExpiresClose}
          paperProps={{ style: { margin: '2.4rem' } }}
        >
          <h2>{t('session.expires')}</h2>
          <p style={{ marginTop: '1.6rem' }}>{t('session.inactive')}</p>
        </AltinnPopoverSimple>
        <PageHeader repoStatus={repoStatus} />
        <LeftMenu
          className={classes.contentWrapper}
          language={language}
          repoStatus={repoStatus}
          subAppClassName={repoStatus.hasMergeConflict ? classes.mergeConflictApp : classes.subApp}
        />
      </div>
    </ThemeProvider>
  );
}
