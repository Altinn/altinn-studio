import React from 'react';
import { Outlet, ScrollRestoration } from 'react-router';
import { Slide, ToastContainer } from 'react-toastify';

import { AppLanguageTranslatorProvider } from 'src/AppLanguageTranslatorProvider';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ViewportWrapper } from 'src/components/ViewportWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { UiPreferencesProvider } from 'src/features/form/layout/UiPreferencesContext';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { NavigationFocusStateProvider } from 'src/features/navigation/NavigationFocusStateContext';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { PartyPrefetcher } from 'src/queries/partyPrefetcher';

export default function AppLayout() {
  return (
    <>
      <AppLanguageTranslatorProvider>
        <NavigationFocusStateProvider>
          <ErrorBoundary>
            <ViewportWrapper>
              <UiPreferencesProvider>
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
              </UiPreferencesProvider>
            </ViewportWrapper>
          </ErrorBoundary>
        </NavigationFocusStateProvider>
      </AppLanguageTranslatorProvider>
      <ScrollRestoration />
    </>
  );
}

// Prevents a console error about missing HydrateFallback when using loaders
export function HydrateFallback() {
  return null;
}
