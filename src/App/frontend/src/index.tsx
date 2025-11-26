// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';
import { Slide, ToastContainer } from 'react-toastify';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';
import 'src/features/baseurlinjection';
import 'src/features/logging';
import 'src/features/styleInjection';
import 'src/features/toggles';

import { QueryClient } from '@tanstack/react-query';

import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ErrorPageContent } from 'src/components/ErrorPageContent';
import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ViewportWrapper } from 'src/components/ViewportWrapper';
import { ComponentRouting, NavigateToStartUrl, ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { ProcessingProvider } from 'src/core/contexts/processingContext';
import { VersionErrorOrChildren } from 'src/features/applicationMetadata/VersionErrorOrChildren';
import { ApplicationSettingsProvider } from 'src/features/applicationSettings/ApplicationSettingsProvider';
import { createDynamicsLoader } from 'src/features/form/dynamics/dynamicsLoader';
import { FormProvider } from 'src/features/form/FormContext';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PartySelectionWrapper } from 'src/features/instantiate/containers/PartySelection';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';
import { LangToolsStoreProvider } from 'src/features/language/LangToolsStore';
import { LanguageProvider } from 'src/features/language/LanguageProvider';
import { TextResourcesProvider } from 'src/features/language/textResources/TextResourcesProvider';
import { NavigationEffectProvider } from 'src/features/navigation/NavigationEffectContext';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { DefaultReceipt } from 'src/features/receipt/ReceiptContainer';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import * as queries from 'src/http-client/queries';
import { createLanguageLoader } from 'src/language/languageLoader';

import 'leaflet/dist/leaflet.css';
import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';
/**
 * This query client should not be used in unit tests, as multiple tests will end up re-using
 * the same query cache. Provide your own when running code in tests.
 */
export const defaultQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // or Infinity if you truly never want auto-refetch
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

document.addEventListener('DOMContentLoaded', () => {
  propagateTraceWhenPdf();

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider
      {...queries}
      queryClient={defaultQueryClient}
    >
      <ErrorBoundary>
        <LanguageProvider>
          <LangToolsStoreProvider>
            <ViewportWrapper>
              <UiConfigProvider>
                <RouterProvider
                  router={createBrowserRouter(
                    [
                      {
                        path: '/:org/:app/*',
                        loader: createLanguageLoader({
                          queryClient: defaultQueryClient,
                        }),
                        element: (
                          <NavigationEffectProvider>
                            <ErrorBoundary>
                              <VersionErrorOrChildren>
                                <GlobalFormDataReadersProvider>
                                  <LayoutSetsProvider>
                                    <TextResourcesProvider>
                                      <OrgsProvider>
                                        <ApplicationSettingsProvider>
                                          <PartyProvider>
                                            <KeepAliveProvider>
                                              <ProcessingProvider>
                                                <Outlet />
                                              </ProcessingProvider>
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
                                  </LayoutSetsProvider>
                                </GlobalFormDataReadersProvider>
                              </VersionErrorOrChildren>
                            </ErrorBoundary>
                          </NavigationEffectProvider>
                        ),
                        children: [
                          {
                            path: 'instance-selection',
                            element: <InstanceSelectionWrapper />,
                          },
                          {
                            path: 'party-selection',
                            element: <PartySelectionWrapper />,
                            children: [
                              {
                                path: ':errorCode',
                                element: <PartySelectionWrapper />,
                              },
                            ],
                          },
                          {
                            path: 'error',
                            element: <ErrorPageContent />,
                          },
                          {
                            path: ':pageKey',
                            element: (
                              <PresentationComponent>
                                <Form />
                              </PresentationComponent>
                            ),
                          },
                          {
                            path: 'instance/:instanceOwnerPartyId/:instanceGuid',
                            element: (
                              <InstanceProvider>
                                <Outlet />
                              </InstanceProvider>
                            ),
                            children: [
                              {
                                path: TaskKeys.ProcessEnd,
                                element: <DefaultReceipt />,
                              },
                              {
                                path: ':taskId',
                                loader: createDynamicsLoader({
                                  application: () => window.AltinnAppData?.applicationMetadata,
                                  layoutSets: () => window.AltinnAppData?.layoutSets,
                                  instanceId: () => window.AltinnAppData?.instance?.id,
                                }),
                                element: (
                                  <FixWrongReceiptType>
                                    <ProcessWrapper>
                                      <FormProvider>
                                        <Outlet />
                                      </FormProvider>
                                    </ProcessWrapper>
                                  </FixWrongReceiptType>
                                ),
                                children: [
                                  {
                                    index: true,
                                    element: <NavigateToStartUrl forceCurrentTask={false} />,
                                  },
                                  {
                                    path: ':pageKey',
                                    children: [
                                      {
                                        index: true,
                                        element: (
                                          <PdfWrapper>
                                            <PresentationComponent>
                                              <Form />
                                            </PresentationComponent>
                                          </PdfWrapper>
                                        ),
                                      },
                                      {
                                        path: ':componentId',
                                        element: <ComponentRouting />,
                                      },
                                      {
                                        path: '*',
                                        element: <ComponentRouting />,
                                      },
                                    ],
                                  },
                                ],
                              },
                            ],
                          },
                        ],
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
        </LanguageProvider>
      </ErrorBoundary>
    </AppQueriesProvider>,
  );
});

// function Root() {
//
//
//   return (
//
//
//   );
// }

// function InstantiationUrlReset() {
//   const location = useLocation();
//   const queryClient = useQueryClient();
//   React.useEffect(() => {
//     if (!location.pathname.includes('/instance/')) {
//       const mutations = queryClient.getMutationCache().findAll({ mutationKey: ['instantiate'] });
//       mutations.forEach((mutation) => queryClient.getMutationCache().remove(mutation));
//     }
//   }, [location.pathname, queryClient]);
//
//   return null;
// }
