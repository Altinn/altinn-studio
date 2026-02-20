// Needed for "useBuiltIns": "entry" in babel.config.json to resolve
// all the polyfills we need and inject them here
import 'core-js';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import { Slide, ToastContainer } from 'react-toastify';

import '@digdir/designsystemet-css';
import '@digdir/designsystemet-theme';
import 'src/features/baseurlinjection';
import 'src/features/logging';
import 'src/features/styleInjection';
import 'src/features/toggles';

import { useQueryClient } from '@tanstack/react-query';

import { AppComponentsBridge } from 'src/AppComponentsBridge';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { Form } from 'src/components/form/Form';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { ViewportWrapper } from 'src/components/ViewportWrapper';
import { ComponentRouting, NavigateToStartUrl, ProcessWrapper } from 'src/components/wrappers/ProcessWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { AppQueriesProvider } from 'src/core/contexts/AppQueriesProvider';
import { Entrypoint } from 'src/features/entrypoint/Entrypoint';
import { FormProvider } from 'src/features/form/FormContext';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PartySelection } from 'src/features/instantiate/containers/PartySelection';
import { InstanceSelectionWrapper } from 'src/features/instantiate/selection/InstanceSelection';
import { NavigationEffectProvider } from 'src/features/navigation/NavigationEffectContext';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { PdfWrapper } from 'src/features/pdf/PdfWrapper';
import { propagateTraceWhenPdf } from 'src/features/propagateTraceWhenPdf';
import { FixWrongReceiptType } from 'src/features/receipt/FixWrongReceiptType';
import { DefaultReceipt } from 'src/features/receipt/ReceiptContainer';
import { TaskKeys } from 'src/hooks/useNavigatePage';
import { AppPrefetcher } from 'src/queries/appPrefetcher';
import { PartyPrefetcher } from 'src/queries/partyPrefetcher';
import * as queries from 'src/queries/queries';

import 'leaflet/dist/leaflet.css';
import 'react-toastify/dist/ReactToastify.css';
import 'src/index.css';

document.addEventListener('DOMContentLoaded', () => {
  propagateTraceWhenPdf();

  const container = document.getElementById('root');
  const root = container && createRoot(container);
  root?.render(
    <AppQueriesProvider {...queries}>
      <ErrorBoundary>
        <AppPrefetcher />
        <RouterProvider
          router={createBrowserRouter(
            [
              {
                // Layout route (route that does not have its own segment, just wraps jsx around children)
                Component: AppLayout,
                children: [
                  { path: 'instance-selection', element: <InstanceSelectionWrapper /> },
                  {
                    path: 'party-selection',
                    children: [
                      { index: true, element: <PartySelection /> },
                      { path: '*', element: <PartySelection /> },
                    ],
                  },
                  {
                    element: <Entrypoint />,
                    children: [
                      {
                        path: ':pageKey',
                        Component: () => (
                          <PresentationComponent>
                            <Form />
                          </PresentationComponent>
                        ),
                      },
                      { index: true, element: <NavigateToStartUrl forceCurrentTask={false} /> },
                    ],
                  },
                  {
                    path: 'instance/:instanceOwnerPartyId/:instanceGuid',
                    Component: () => (
                      <InstanceProvider>
                        <Outlet />
                      </InstanceProvider>
                    ),
                    children: [
                      { index: true, element: <NavigateToStartUrl /> },
                      { path: TaskKeys.ProcessEnd, element: <DefaultReceipt /> },
                      {
                        path: ':taskId',
                        Component: () => (
                          <FixWrongReceiptType>
                            <ProcessWrapper>
                              <FormProvider>
                                <Outlet />
                              </FormProvider>
                            </ProcessWrapper>
                          </FixWrongReceiptType>
                        ),
                        children: [
                          { index: true, element: <NavigateToStartUrl forceCurrentTask={false} /> },
                          {
                            path: ':pageKey',
                            children: [
                              {
                                index: true,
                                Component: () => (
                                  <PdfWrapper>
                                    <PresentationComponent>
                                      <Form />
                                    </PresentationComponent>
                                  </PdfWrapper>
                                ),
                              },
                              {
                                path: ':componentId',
                                children: [
                                  { index: true, element: <ComponentRouting /> },
                                  { path: '*', element: <ComponentRouting /> },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                path: 'partyselection',
                children: [
                  {
                    index: true,
                    element: (
                      <Navigate
                        to='/party-selection'
                        replace
                      />
                    ),
                  },
                  {
                    path: '*',
                    element: (
                      <Navigate
                        to='/party-selection'
                        replace
                      />
                    ),
                  },
                ],
              },
            ],
            {
              basename: `/${window.org}/${window.app}`,
            },
          )}
        />
      </ErrorBoundary>
    </AppQueriesProvider>,
  );
});

function AppLayout() {
  return (
    <AppComponentsBridge>
      <NavigationEffectProvider>
        <ErrorBoundary>
          <ViewportWrapper>
            <UiConfigProvider>
              <InstantiationUrlReset />
              <GlobalFormDataReadersProvider>
                <PartyProvider>
                  <KeepAliveProvider>
                    <Outlet />
                    <ToastContainer
                      position='top-center'
                      theme='colored'
                      transition={Slide}
                      draggable={false}
                    />
                  </KeepAliveProvider>
                </PartyProvider>
                <PartyPrefetcher />
              </GlobalFormDataReadersProvider>
            </UiConfigProvider>
          </ViewportWrapper>
        </ErrorBoundary>
      </NavigationEffectProvider>
    </AppComponentsBridge>
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
