import React, { useCallback, useEffect, useRef } from 'react';
import { HandleServiceInformationActions } from '../features/overview/handleServiceInformationSlice';
import {
  fetchRemainingSession,
  keepAliveSession,
  signOutUser,
} from '../sharedResources/user/userSlice';
import './App.css';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import classes from './App.module.css';
import { useAppDispatch, useAppSelector } from '../hooks';
import { getRepositoryType } from 'app-shared/utils/repository';
import { RepositoryType } from 'app-shared/types/global';
import { repoMetaPath, serviceConfigPath, serviceNamePath } from 'app-shared/api/paths';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '../../language/src/nb.json';
import en from '../../language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { appContentWrapperId } from '@studio/testing/testids';
import { SessionExpiredModal } from './SessionExpiredModal';

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
  const org = match?.params?.org ?? '';
  const app = match?.params?.app ?? '';

  const repositoryType = getRepositoryType(org, app);
  const remainingSessionMinutes = useAppSelector(
    (state) => state.userState.session.remainingMinutes,
  );
  const dispatch = useAppDispatch();
  const lastKeepAliveTimestamp = useRef<number>(0);
  const sessionExpiredPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    dispatch(fetchRemainingSession());
    if (app && org) {
      dispatch(
        HandleServiceInformationActions.fetchService({
          url: repoMetaPath(org, app),
        }),
      );

      if (repositoryType === RepositoryType.App) {
        dispatch(
          HandleServiceInformationActions.fetchServiceName({
            url: serviceNamePath(org, app),
          }),
        );

        dispatch(
          HandleServiceInformationActions.fetchServiceConfig({
            url: serviceConfigPath(org, app),
          }),
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
          keepAliveSessionState,
        ),
      );
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
    return function cleanup() {
      setEventListeners(false);
    };
  }, [app, dispatch, lastKeepAliveTimestamp, org, remainingSessionMinutes]);

  const handleClickClose = useCallback(() => {
    dispatch(signOutUser());
  }, [dispatch]);

  const handleClickContinue = useCallback(() => {
    dispatch(keepAliveSession());
    lastKeepAliveTimestamp.current = Date.now();
  }, [dispatch]);

  return (
    <div className={classes.container} ref={sessionExpiredPopoverRef}>
      <SessionExpiredModal
        open={remainingSessionMinutes < 11}
        onClose={handleClickClose}
        onContinue={handleClickContinue}
      />
      <div data-testid={appContentWrapperId}>
        <Outlet />
      </div>
    </div>
  );
}
