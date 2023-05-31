import React, { useCallback, useEffect, useRef } from 'react';
import postMessages from 'app-shared/utils/postMessages';
import { AltinnPopoverSimple } from 'app-shared/components/molecules/AltinnPopoverSimple';
import { DataModelsMetadataActions } from 'app-shared/features/dataModelling/sagas/metadata';
import { HandleServiceInformationActions } from './features/administration/handleServiceInformationSlice';
import { ApplicationMetadataActions } from './sharedResources/applicationMetadata/applicationMetadataSlice';
import {
  fetchRemainingSession,
  keepAliveSession,
  signOutUser,
} from './sharedResources/user/userSlice';
import { PageHeader } from './layout/PageHeader';
import './App.css';
import { PageContainer } from './layout/PageContainer';
import { matchPath, useLocation } from 'react-router-dom';
import classes from './App.module.css';
import { useAppDispatch, useAppSelector } from './hooks';
import { getRepositoryType } from 'app-shared/utils/repository';
import { RepositoryType } from 'app-shared/types/global';
import {
  repoInitialCommitPath,
  repoMetaPath,
  serviceConfigPath,
  serviceNamePath,
} from 'app-shared/api/paths';
import i18next from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import nb from '../language/src/nb.json';
import en from '../language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useRepoStatusQuery } from './hooks/queries';
import { MergeConflictWarning } from './features/simpleMerge/MergeConflictWarning';

const TEN_MINUTES_IN_MILLISECONDS = 600000;

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  fallbackLng: 'nb',
  react: {
    transSupportBasicHtmlNodes: true,
    transKeepBasicHtmlNodesFor: ['em'],
  },
});

export function App() {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const { org, app } = match.params;
  const repositoryType = getRepositoryType(org, app);
  const { t } = useTranslation();
  const { data: repoStatus, refetch } = useRepoStatusQuery(org, app);
  const remainingSessionMinutes = useAppSelector(
    (state) => state.userState.session.remainingMinutes
  );
  const dispatch = useAppDispatch();
  const lastKeepAliveTimestamp = useRef<number>(0);
  const sessionExpiredPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(DataModelsMetadataActions.getDataModelsMetadata());
    if (repositoryType === RepositoryType.App) {
      dispatch(ApplicationMetadataActions.getApplicationMetadata({ org, app }));
    }
  }, [app, dispatch, org, repositoryType]);

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
    const windowEventReceived = async (event: any) => {
      if (event.data === postMessages.forceRepoStatusCheck) {
        await refetch();
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
  }, [app, dispatch, lastKeepAliveTimestamp, org, refetch, remainingSessionMinutes]);

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
  if (!repoStatus) {
    return null;
  }
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
      <PageHeader showSubMenu={!repoStatus.hasMergeConflict} org={org} app={app} />

      <div className={classes.contentWrapper} data-testid={'app-content-wrapper'}>
        {repoStatus.hasMergeConflict ? (
          <MergeConflictWarning org={org} app={app} />
        ) : (
          <PageContainer subAppClassName={classes.subApp} />
        )}
      </div>
    </div>
  );
}
