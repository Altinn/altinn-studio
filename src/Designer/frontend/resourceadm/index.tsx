import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { RESOURCEADM_BASENAME, DEFAULT_LANGUAGE } from 'app-shared/constants';
import { App } from './app/App';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import studio_nb from '../language/src/nb.json';
import studio_en from '../language/src/en.json';
import resourceadm_nb from './language/src/nb.json';
import resourceadm_en from './language/src/en.json';

import type { QueryClientConfig } from '@tanstack/react-query';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import 'app-shared/design-tokens';

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  resources: {
    nb: { translation: { ...studio_nb, ...resourceadm_nb } },
    en: { translation: { ...studio_en, ...resourceadm_en } },
  },
  fallbackLng: 'nb',
});

const container = document.getElementById('root');
const root = createRoot(container);

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
};

root.render(
  <BrowserRouter basename={RESOURCEADM_BASENAME}>
    <ServicesContextProvider clientConfig={queryClientConfig} {...queries} {...mutations}>
      <App />
    </ServicesContextProvider>
  </BrowserRouter>,
);
