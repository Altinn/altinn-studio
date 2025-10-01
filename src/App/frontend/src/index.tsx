// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, useLocation } from 'react-router-dom';
import { Slide, ToastContainer } from 'react-toastify';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';
import 'src/features/baseurlinjection';
import 'src/features/logging';
import 'src/features/styleInjection';
import 'src/features/toggles';

import { useQueryClient } from '@tanstack/react-query';

import { App } from 'src/App';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ViewportWrapper } from 'src/components/ViewportWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { ProcessingProvider } from 'src/core/contexts/processingContext';
import { DisplayErrorProvider } from 'src/core/errorHandling/DisplayErrorProvider';
import { VersionErrorOrChildren } from 'src/features/applicationMetadata/VersionErrorOrChildren';
import { ApplicationSettingsProvider } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { LangToolsStoreProvider } from 'src/features/language/LangToolsStore';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { NavigationEffectProvider } from 'src/features/navigation/NavigationEffectContext';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
// import { AppPrefetcher } from 'src/queries/appPrefetcher';
import { PartyPrefetcher } from 'src/queries/partyPrefetcher';
import * as queries from 'src/queries/queries';

import 'leaflet/dist/leaflet.css';
import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';

document.addEventListener('DOMContentLoaded', () => {
  propagateTraceWhenPdf();

  // @ts-ignore
  // console.log(JSON.stringify(window.AltinnAppData, null, 2));

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider {...queries}>
      <ErrorBoundary>
        {/*<AppPrefetcher />*/}
        <LangToolsStoreProvider>
          <ViewportWrapper>
            <UiConfigProvider>
              <RouterProvider
                router={createBrowserRouter(
                  [
                    {
                      path: '/ttd/component-library/*',
                      element: (
                        <NavigationEffectProvider>
                          <ErrorBoundary>
                            <Root />
                          </ErrorBoundary>
                        </NavigationEffectProvider>
                      ),
                    },
                  ],
                  {
                    future: {
                      v7_relativeSplatPath: true,
                    },
                  },
                )}
                future={{ v7_startTransition: true }}
              />
            </UiConfigProvider>
          </ViewportWrapper>
        </LangToolsStoreProvider>
      </ErrorBoundary>
    </AppQueriesProvider>,
  );
});

function Root() {
  console.log('Root');
  const currentLanguage = useCurrentLanguage();

  return (
    <div lang={currentLanguage}>
      <InstantiationUrlReset />
      <VersionErrorOrChildren>
        <GlobalFormDataReadersProvider>
          <LayoutSetsProvider>
            {/*<ProfileProvider>*/}
            <TextResourcesProvider>
              <OrgsProvider>
                <ApplicationSettingsProvider>
                  <PartyProvider>
                    <KeepAliveProvider>
                      <DisplayErrorProvider>
                        <ProcessingProvider>
                          <App />
                        </ProcessingProvider>
                      </DisplayErrorProvider>
                      <ToastContainer
                        position='top-center'
                        theme='colored'
                        transition={Slide}
                        draggable={false}
                      />
                    </KeepAliveProvider>
                  </PartyProvider>
                </ApplicationSettingsProvider>
              </OrgsProvider>
            </TextResourcesProvider>
            {/*</ProfileProvider>*/}
            <PartyPrefetcher />
          </LayoutSetsProvider>
        </GlobalFormDataReadersProvider>
      </VersionErrorOrChildren>
    </div>
  );
}

function InstantiationUrlReset() {
  const location = useLocation();
  const queryClient = useQueryClient();
  React.useEffect(() => {
    if (!location.pathname.includes('/instance/')) {
      const mutations = queryClient.getMutationCache().findAll({ mutationKey: ['instantiate'] });
      mutations.forEach((mutation) => queryClient.getMutationCache().remove(mutation));
    }
  }, [location.pathname, queryClient]);

  return null;
}
