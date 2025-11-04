import React from 'react';
import { createRoot } from 'react-dom/client';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import 'app-shared/design-tokens';
import type { LoggerConfig } from 'app-shared/contexts/LoggerContext';
import { LoggerContextProvider } from 'app-shared/contexts/LoggerContext';
import { PostHogContextProvider } from 'app-shared/contexts/PostHogContext';
import { EnvironmentConfigProvider } from 'app-shared/contexts/EnvironmentConfigContext';
import type { QueryClientConfig } from '@tanstack/react-query';
import { PageRoutes } from './router/PageRoutes';
import { AppDevelopmentContextProvider } from './contexts/AppDevelopmentContext';
import { FeatureFlagsProvider } from '@studio/feature-flags';
import { ConsentProvider } from './utils/consent';
import { ConsentBanner } from './components/ConsentBanner';

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
    },
  },
};

root.render(
  <ServicesContextProvider clientConfig={queryClientConfig} {...queries} {...mutations}>
    <EnvironmentConfigProvider>
      <LoggerContextProvider config={loggerConfig}>
        <FeatureFlagsProvider>
          <PostHogContextProvider>
            <ConsentProvider>
              <PreviewConnectionContextProvider>
                <AppDevelopmentContextProvider>
                  <PageRoutes />
                  <ConsentBanner />
                </AppDevelopmentContextProvider>
              </PreviewConnectionContextProvider>
            </ConsentProvider>
          </PostHogContextProvider>
        </FeatureFlagsProvider>
      </LoggerContextProvider>
    </EnvironmentConfigProvider>
  </ServicesContextProvider>,
);
