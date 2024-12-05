// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { createHashRouter, RouterProvider, ScrollRestoration } from 'react-router-dom';
import { Slide, ToastContainer } from 'react-toastify';

import 'src/features/baseurlinjection';
import 'src/features/toggles';
import 'src/features/logging';
import 'src/features/styleInjection';
import '@digdir/designsystemet-css';

import { AppWrapper } from '@altinn/altinn-design-system';

import { App } from 'src/App';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ThemeWrapper } from 'src/components/ThemeWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { TaskStoreProvider } from 'src/core/contexts/taskStoreContext';
import { ApplicationMetadataProvider } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { ApplicationSettingsProvider } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { InstantiationProvider } from 'src/features/instantiate/InstantiationContext';
import { LangToolsStoreProvider } from 'src/features/language/LangToolsStore';
import { LanguageProvider } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { ProfileProvider } from 'src/features/profile/ProfileProvider';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
import { AppRoutingProvider } from 'src/features/routing/AppRoutingContext';
import { AppPrefetcher } from 'src/queries/appPrefetcher';
import { PartyPrefetcher } from 'src/queries/partyPrefetcher';
import * as queries from 'src/queries/queries';

import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';
import '@digdir/designsystemet-theme/brand/altinn/tokens.css';

const router = createHashRouter([
  {
    path: '*',
    element: (
      <AppRoutingProvider>
        <ErrorBoundary>
          <Root />
        </ErrorBoundary>
      </AppRoutingProvider>
    ),
  },
]);

document.addEventListener('DOMContentLoaded', () => {
  propagateTraceWhenPdf();

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider {...queries}>
      <AppPrefetcher />
      <ErrorBoundary>
        <AppWrapper>
          <LanguageProvider>
            <LangToolsStoreProvider>
              <ThemeWrapper>
                <UiConfigProvider>
                  <RouterProvider router={router} />
                </UiConfigProvider>
              </ThemeWrapper>
            </LangToolsStoreProvider>
          </LanguageProvider>
        </AppWrapper>
      </ErrorBoundary>
    </AppQueriesProvider>,
  );
});

function Root() {
  return (
    <InstantiationProvider>
      <TaskStoreProvider>
        <ApplicationMetadataProvider>
          <GlobalFormDataReadersProvider>
            <LayoutSetsProvider>
              <ProfileProvider>
                <TextResourcesProvider>
                  <OrgsProvider>
                    <ApplicationSettingsProvider>
                      <PartyProvider>
                        <KeepAliveProvider>
                          <HelmetProvider>
                            <TaskStoreProvider>
                              <App />
                            </TaskStoreProvider>
                            <ToastContainer
                              position='top-center'
                              theme='colored'
                              transition={Slide}
                              draggable={false}
                            />
                          </HelmetProvider>
                          <ScrollRestoration />
                        </KeepAliveProvider>
                      </PartyProvider>
                    </ApplicationSettingsProvider>
                  </OrgsProvider>
                </TextResourcesProvider>
              </ProfileProvider>
              <PartyPrefetcher />
            </LayoutSetsProvider>
          </GlobalFormDataReadersProvider>
        </ApplicationMetadataProvider>
      </TaskStoreProvider>
    </InstantiationProvider>
  );
}
