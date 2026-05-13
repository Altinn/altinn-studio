import React from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { Slide, ToastContainer } from 'react-toastify';

import { AppComponentsBridge } from 'src/AppComponentsBridge';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ViewportWrapper } from 'src/components/ViewportWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { NavigationFocusStateProvider } from 'src/features/navigation/NavigationFocusStateContext';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { PartyPrefetcher } from 'src/queries/partyPrefetcher';

export function AppLayout() {
  return (
    <>
      <AppComponentsBridge>
        <NavigationFocusStateProvider>
          <ErrorBoundary>
            <ViewportWrapper>
              <UiConfigProvider>
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
        </NavigationFocusStateProvider>
      </AppComponentsBridge>
      <ScrollRestoration />
    </>
  );
}
