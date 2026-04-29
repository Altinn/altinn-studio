import { createRoot } from 'react-dom/client';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import i18next from 'i18next';
import nb from '@altinn-studio/language/src/nb.json';
import en from '@altinn-studio/language/src/en.json';
import { initReactI18next } from 'react-i18next';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import 'app-shared/design-tokens';
import type { LoggerConfig } from 'app-shared/contexts/LoggerContext';
import { LoggerContextProvider } from 'app-shared/contexts/LoggerContext';
import { EnvironmentConfigProvider } from 'app-shared/contexts/EnvironmentConfigContext';
import type { QueryClientConfig } from '@tanstack/react-query';
import { PageRoutes } from './routes/PageRoutes';
import { PostHogContextProvider } from 'app-shared/contexts/PostHogContext';
import { ConsentProvider } from 'app-shared/utils/consent';
import { ConsentBanner } from 'app-shared/components';
import { FeatureFlagsProvider } from '@studio/feature-flags';

const loggerConfig: LoggerConfig = {
  enableUnhandledPromiseRejectionTracking: true,
  loggingLevelTelemetry: 2,
};

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
  <FeatureFlagsProvider>
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
    </ServicesContextProvider>
  </FeatureFlagsProvider>,
);
