import React, { useCallback, useEffect, useRef } from 'react';
import postMessages from 'app-shared/utils/postMessages';
import { AltinnPopoverSimple } from 'app-shared/components/molecules/AltinnPopoverSimple';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { HandleServiceInformationActions } from './features/administration/handleServiceInformationSlice';
import { fetchRepoStatus } from './features/handleMergeConflict/handleMergeConflictSlice';
import { makeGetRepoStatusSelector } from './features/handleMergeConflict/handleMergeConflictSelectors';
import { ApplicationMetadataActions } from './sharedResources/applicationMetadata/applicationMetadataSlice';
import { fetchLanguage } from './utils/fetchLanguage/languageSlice';
import {
  fetchRemainingSession,
  keepAliveSession,
  signOutUser,
} from './sharedResources/user/userSlice';
import PageHeader from './layout/PageHeader';

import './App.css';
import LeftMenu from './layout/LeftMenu';
import { matchPath, useLocation } from 'react-router-dom';

import classes from './App.module.css';
import { useAppDispatch, useAppSelector } from './common/hooks';
import { getRepositoryType } from 'app-shared/utils/repository';
import { RepositoryType } from 'app-shared/types/global';
import {
  frontendLangPath,
  repoInitialCommitPath,
  repoMetaPath,
  repoStatusPath,
  serviceConfigPath,
  serviceNamePath,
} from 'app-shared/api-paths';

const GetRepoStatusSelector = makeGetRepoStatusSelector();
const TEN_MINUTES_IN_MILLISECONDS = 600000;

export function App() {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const { org, app } = match.params;
  const repositoryType = getRepositoryType(org, app);
  const language = useAppSelector((state) => state.languageState.language);
  const t = (key: string) => getLanguageFromKey(key, language);
  const repoStatus = useAppSelector(GetRepoStatusSelector);
  const remainingSessionMinutes = useAppSelector(
    (state) => state.userState.session.remainingMinutes
  );
  const dispatch = useAppDispatch();
  const lastKeepAliveTimestamp = useRef<number>(0);
  const sessionExpiredPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(
      fetchLanguage({
        url: frontendLangPath('nb'),
      })
    );
    dispatch(DataModelsMetadataActions.getDataModelsMetadata());
    if (repositoryType === RepositoryType.App) {
      dispatch(ApplicationMetadataActions.getApplicationMetadata());
    }
  }, [dispatch, repositoryType]);

  useEffect(() => {
    dispatch(fetchRemainingSession());
    if (app && org) {
      dispatch(
        HandleServiceInformationActions.fetchService({
          url: repoMetaPath(org, app),
        })
      );
      dispatch(
        HandleServiceInformationActions.fetchInitialCommit({
          url: repoInitialCommitPath(org, app),
        })
      );

      if (repositoryType === RepositoryType.App) {
        dispatch(
          HandleServiceInformationActions.fetchServiceName({
            url: serviceNamePath(org, app),
          })
        );

        dispatch(
          HandleServiceInformationActions.fetchServiceConfig({
            url: serviceConfigPath(org, app),
          })
        );
      }
    }
  }, [app, dispatch, org, repositoryType]);

  useEffect(() => {
    const setEventListeners = (subscribe: boolean) => {
      const keepAliveListeners = ['mousemove', 'scroll', 'onfocus', 'keydown'];
      keepAliveListeners.forEach((listener) =>
        (subscribe ? window.addEventListener : window.removeEventListener)(
          listener,
          keepAliveSessionState
        )
      );
    };
    const windowEventReceived = (event: any) => {
      if (event.data === postMessages.forceRepoStatusCheck) {
        dispatch(
          fetchRepoStatus({
            url: repoStatusPath(org, app),
            org,
            repo: app,
          })
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
    [dispatch]
  );

  return (
    <div className={classes.container} ref={sessionExpiredPopoverRef}>
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
  );
}
