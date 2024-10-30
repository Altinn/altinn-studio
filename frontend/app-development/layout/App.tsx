import React, { useEffect } from 'react';
import postMessages from 'app-shared/utils/postMessages';
import './App.css';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import classes from './App.module.css';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '../../language/src/nb.json';
import en from '../../language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { appContentWrapperId } from '@studio/testing/testids';

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

  const { refetch: reFetchRepoStatus } = useRepoStatusQuery(org, app);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const windowEventReceived = async (event: any) => {
      if (event.data === postMessages.forceRepoStatusCheck) {
        await reFetchRepoStatus();
      }
    };

    window.addEventListener('message', windowEventReceived);
    return function cleanup() {
      window.removeEventListener('message', windowEventReceived);
    };
  }, [reFetchRepoStatus]);

  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId} className={classes.appContainer}>
        <Outlet />
      </div>
    </div>
  );
}
