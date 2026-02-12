import React from 'react';
import { createRoot } from 'react-dom/client';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import 'app-shared/design-tokens';
import type { LoggerConfig } from 'app-shared/contexts/LoggerContext';
import { LoggerContextProvider } from 'app-shared/contexts/LoggerContext';
import { EnvironmentConfigProvider } from 'app-shared/contexts/EnvironmentConfigContext';
import type { QueryClientConfig } from '@tanstack/react-query';
import { PageRoutes } from './router/PageRoutes';
import { PostHogContextProvider } from 'app-shared/contexts/PostHogContext';
import { ConsentProvider } from 'app-shared/utils/consent';
import { ConsentBanner } from 'app-shared/components';

const loggerConfig: LoggerConfig = {
  enableUnhandledPromiseRejectionTracking: true,
  loggingLevelTelemetry: 2,
};

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
};

root.render(
  <ServicesContextProvider clientConfig={queryClientConfig} {...queries} {...mutations}>
    <EnvironmentConfigProvider>
      <LoggerContextProvider config={loggerConfig}>
        <PostHogContextProvider>
          <ConsentProvider>
            <ConsentBanner />
            <PageRoutes />
          </ConsentProvider>
        </PostHogContextProvider>
      </LoggerContextProvider>
    </EnvironmentConfigProvider>
  </ServicesContextProvider>,
);
