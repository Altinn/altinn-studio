import React from 'react';
import { createRoot } from 'react-dom/client';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import 'app-shared/design-tokens';
import type { LoggerConfig } from 'app-shared/contexts/LoggerContext';
import { LoggerContextProvider } from 'app-shared/contexts/LoggerContext';
import { altinnStudioEnvironment } from 'app-shared/utils/altinnStudioEnv';
import type { QueryClientConfig } from '@tanstack/react-query';
import { PageRoutes } from './router/PageRoutes';
import { AppDevelopmentContextProvider } from './contexts/AppDevelopmentContext';

const loggerConfig: LoggerConfig = {
  connectionString: altinnStudioEnvironment.aiConnectionString,
  enableUnhandledPromiseRejectionTracking: true,
  loggingLevelTelemetry: 2,
};

// ONLY FOR TESTING! REMOVE WHEN DONE
const triggerTests = 'Trigger tests';
console.log(triggerTests);

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
    <ServicesContextProvider clientConfig={queryClientConfig} {...queries} {...mutations}>
      <PreviewConnectionContextProvider>
        <AppDevelopmentContextProvider>
          <PageRoutes />
        </AppDevelopmentContextProvider>
      </PreviewConnectionContextProvider>
    </ServicesContextProvider>
  </LoggerContextProvider>,
);
