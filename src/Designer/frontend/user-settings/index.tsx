import React from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import nb from '@altinn-studio/language/src/nb.json';
import en from '@altinn-studio/language/src/en.json';
import type { QueryClientConfig } from '@tanstack/react-query';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import 'app-shared/design-tokens';
import type { LoggerConfig } from 'app-shared/contexts/LoggerContext';
import { LoggerContextProvider } from 'app-shared/contexts/LoggerContext';
import { PageRoutes } from './routes/PageRoutes';
import { EnvironmentConfigProvider } from 'app-shared/contexts/EnvironmentConfigContext';

const loggerConfig: LoggerConfig = {
  enableUnhandledPromiseRejectionTracking: true,
  loggingLevelTelemetry: 2,
};

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

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
};

root.render(
  <ServicesContextProvider clientConfig={queryClientConfig} {...queries} {...mutations}>
    <EnvironmentConfigProvider>
      <LoggerContextProvider config={loggerConfig}>
        <PageRoutes />
      </LoggerContextProvider>
    </EnvironmentConfigProvider>
  </ServicesContextProvider>,
);
