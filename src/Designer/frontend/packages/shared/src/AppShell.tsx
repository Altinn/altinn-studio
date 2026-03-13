import type { FC, ReactNode } from 'react';
import React from 'react';

import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import * as queries from 'app-shared/api/queries';
import * as mutations from 'app-shared/api/mutations';
import { LoggerContextProvider } from './contexts/LoggerContext';

import { ToastContainer, Slide } from 'react-toastify';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { combineComponents } from './contexts/combineComponents';

import 'react-toastify/dist/ReactToastify.css';
import '@digdir/designsystemet-theme/brand/altinn/tokens.css';
import '@digdir/designsystemet-css/index.css';
import './styles/toast.css';
import './styles/global.css';
import { EnvironmentConfigProvider } from './contexts/EnvironmentConfigContext';
import { FeatureFlagsProvider } from '@studio/feature-flags';
import { initI18n, TranslationResources } from './configs/i18nConfig';
import { PostHogContextProvider } from './contexts/PostHogContext';
import { ConsentProvider } from './utils/consent';
import { ConsentBanner } from './components';
import { QueryClientSetupProvider } from './contexts/QueryClientSetupProvider';
import { queryClientConfig } from './configs/queryClientConfig';
import { loggerConfig } from './configs/loggerConfig';
import { Routes } from './routes/Routes';

type AppShellProps = {
  basename: string;
  providers?: FC<{ children: ReactNode }>[];
  routes: ReactNode;
  extraTranslations?: TranslationResources;
};

export const AppShell = ({
  basename,
  providers,
  routes,
  extraTranslations = {},
}: AppShellProps) => {
  initI18n(extraTranslations);

  const Providers =
    providers && providers.length > 0
      ? combineComponents(...providers)
      : ({ children }: { children?: ReactNode }) => <>{children}</>;

  return (
    <FeatureFlagsProvider>
      <QueryClientSetupProvider clientConfig={queryClientConfig}>
        <ServicesContextProvider {...queries} {...mutations}>
          <EnvironmentConfigProvider>
            <LoggerContextProvider config={loggerConfig}>
              <PostHogContextProvider>
                <ConsentProvider>
                  <ToastContainer
                    position='top-center'
                    theme='colored'
                    transition={Slide}
                    draggable={false}
                  />
                  <ConsentBanner />
                  <Providers>
                    <Routes basename={basename} routes={routes} />
                  </Providers>
                  <ReactQueryDevtools initialIsOpen={false} />
                </ConsentProvider>
              </PostHogContextProvider>
            </LoggerContextProvider>
          </EnvironmentConfigProvider>
        </ServicesContextProvider>
      </QueryClientSetupProvider>
    </FeatureFlagsProvider>
  );
};
