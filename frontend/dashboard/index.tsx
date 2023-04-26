import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DASHBOARD_BASENAME } from 'app-shared/constants';
import { App } from './app/App';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '../language/src/nb.json';
import en from '../language/src/en.json';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServicesContextProvider } from './contexts/servicesContext';
import { userService } from './services/userService';
import { organizationService } from './services/organizationService';
import { repoService } from './services/repoService';

i18next.use(initReactI18next).init({
  lng: DEFAULT_LANGUAGE,
  resources: {
    nb: { translation: nb },
    en: { translation: en },
  },
  fallbackLng: 'nb',
});

const container = document.getElementById('root');
const root = createRoot(container);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

root.render(
  <BrowserRouter basename={DASHBOARD_BASENAME}>
    <QueryClientProvider client={queryClient}>
      <ServicesContextProvider
        userService={userService}
        organizationService={organizationService}
        repoService={repoService}
      >
        <App />
      </ServicesContextProvider>
    </QueryClientProvider>
  </BrowserRouter>
);
