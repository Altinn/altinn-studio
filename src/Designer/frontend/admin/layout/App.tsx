import React, { useEffect } from 'react';
import './App.css';
import { Outlet, useLocation } from 'react-router-dom';
import classes from './App.module.css';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '../../language/src/nb.json';
import en from '../../language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { appContentWrapperId } from '@studio/testing/testids';
import { WebSocketSyncWrapper } from './WebSocketSyncWrapper';

i18next.use(initReactI18next).init({
  ns: 'translation',
  defaultNS: 'translation',
  fallbackNS: 'translation',
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className={classes.container}>
      <div data-testid={appContentWrapperId} className={classes.appContainer}>
        <WebSocketSyncWrapper>
          <Outlet />
        </WebSocketSyncWrapper>
      </div>
    </div>
  );
}
