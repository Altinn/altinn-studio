// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router-dom';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';
import 'src/features/baseurlinjection';
import 'src/features/logging';
import 'src/features/styleInjection';
import 'src/features/toggles';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ErrorPageContent } from 'src/components/ErrorPageContent';
import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ViewportWrapper } from 'src/components/ViewportWrapper';
import { ComponentRouting } from 'src/components/wrappers/ProcessWrapper';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { createInstanceLoader } from 'src/features/instance/instanceLoader';
import { PartySelectionWrapper } from 'src/features/instantiate/containers/PartySelection';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
import { DefaultReceipt } from 'src/features/receipt/ReceiptContainer';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import { createGlobalDataLoader } from 'src/language/globalStateLoader';
import { NextForm } from 'src/next/NextForm';

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
    <QueryClientProvider client={defaultQueryClient}>
      <ReactQueryDevtools />
      <ErrorBoundary>
        <ViewportWrapper>
          <UiConfigProvider>
            <RouterProvider
              router={createBrowserRouter(
                [
                  {
                    path: '/:org/:app/*',
                    loader: createGlobalDataLoader({
                      queryClient: defaultQueryClient,
                    }),
                    element: <Outlet />,
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
                        loader: createInstanceLoader({
                          queryClient: defaultQueryClient,
                        }),
                        element: <Outlet />,
                        children: [
                          {
                            path: TaskKeys.ProcessEnd,
                            element: <DefaultReceipt />,
                          },
                          {
                            path: ':taskId',
                            element: <Outlet />,
                            children: [
                              {
                                path: ':pageKey',
                                children: [
                                  {
                                    index: true,
                                    element: <NextForm />,
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
      </ErrorBoundary>
    </QueryClientProvider>,
  );
});
