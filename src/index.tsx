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
import '@digdir/designsystemet-theme';

import { App } from 'src/App';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ViewportWrapper } from 'src/components/ViewportWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { ProcessingProvider } from 'src/core/contexts/processingContext';
import { TaskStoreProvider } from 'src/core/contexts/taskStoreContext';
import { DisplayErrorProvider } from 'src/core/errorHandling/DisplayErrorProvider';
import { ApplicationMetadataProvider } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { ApplicationSettingsProvider } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { InstantiationProvider } from 'src/features/instantiate/InstantiationContext';
import { LangToolsStoreProvider } from 'src/features/language/LangToolsStore';
import { LanguageProvider, SetShouldFetchAppLanguages } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { ProfileProvider } from 'src/features/profile/ProfileProvider';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
import { AppRoutingProvider } from 'src/features/routing/AppRoutingContext';
import { AppPrefetcher } from 'src/queries/appPrefetcher';
import { PartyPrefetcher } from 'src/queries/partyPrefetcher';
import * as queries from 'src/queries/queries';

import 'leaflet/dist/leaflet.css';
import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';

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
      <ErrorBoundary>
        <AppPrefetcher />
        <LanguageProvider>
          <LangToolsStoreProvider>
            <ViewportWrapper>
              <UiConfigProvider>
                <RouterProvider
                  router={router}
                  future={{ v7_startTransition: true }}
                />
              </UiConfigProvider>
            </ViewportWrapper>
          </LangToolsStoreProvider>
        </LanguageProvider>
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
              <SetShouldFetchAppLanguages />
              <ProfileProvider>
                <TextResourcesProvider>
                  <OrgsProvider>
                    <ApplicationSettingsProvider>
                      <PartyProvider>
                        <KeepAliveProvider>
                          <HelmetProvider>
                            <TaskStoreProvider>
                              <DisplayErrorProvider>
                                <ProcessingProvider>
                                  <App />
                                </ProcessingProvider>
                              </DisplayErrorProvider>
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
