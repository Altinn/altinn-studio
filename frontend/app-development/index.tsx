import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { run } from './sagas';
import { setupStore } from './store';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import 'app-shared/design-tokens';
import type { LoggerConfig } from 'app-shared/contexts/LoggerContext';
import { LoggerContextProvider } from 'app-shared/contexts/LoggerContext';
import 'app-shared/design-tokens';
import { altinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';
import type { QueryClientConfig } from '@tanstack/react-query';
import { PageRoutes } from './router/PageRoutes';

const store = setupStore();

const loggerConfig: LoggerConfig = {
  instrumentationKey: altinnStudioEnvironment.instrumentationKey,
  enableUnhandledPromiseRejectionTracking: true,
  loggingLevelTelemetry: 2,
};

/**
 * Setup all Sagas to listen to the defined events
 */
run();

const container = document.getElementById('root') as HTMLElement;
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
  <LoggerContextProvider config={loggerConfig}>
    <Provider store={store}>
      <ServicesContextProvider clientConfig={queryClientConfig} {...queries} {...mutations}>
        <PreviewConnectionContextProvider>
          <PageRoutes />
        </PreviewConnectionContextProvider>
      </ServicesContextProvider>
    </Provider>
  </LoggerContextProvider>,
);
