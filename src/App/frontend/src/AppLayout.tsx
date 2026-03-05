import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Slide, ToastContainer } from 'react-toastify';

import { useQueryClient } from '@tanstack/react-query';

import { AppComponentsBridge } from 'src/AppComponentsBridge';
import { ErrorBoundary } from 'src/components/ErrorBoundary';
import { ViewportWrapper } from 'src/components/ViewportWrapper';
import { KeepAliveProvider } from 'src/core/auth/KeepAliveProvider';
import { UiConfigProvider } from 'src/features/form/layout/UiConfigContext';
import { GlobalFormDataReadersProvider } from 'src/features/formData/FormDataReaders';
import { NavigationEffectProvider } from 'src/features/navigation/NavigationEffectContext';
import { PartyProvider } from 'src/features/party/PartiesProvider';
import { PartyPrefetcher } from 'src/queries/partyPrefetcher';

export function AppLayout() {
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

  useEffect(() => {
    if (!location.pathname.includes('/instance/')) {
      const mutations = queryClient.getMutationCache().findAll({ mutationKey: ['instantiate'] });
      mutations.forEach((mutation) => queryClient.getMutationCache().remove(mutation));
    }
  }, [location.pathname, queryClient]);

  return null;
}
