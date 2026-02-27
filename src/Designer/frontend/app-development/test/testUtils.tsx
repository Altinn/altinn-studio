import React from 'react';
import type { RenderOptions } from '@testing-library/react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import type { FeatureFlag } from '@studio/feature-flags';
import { AppDevelopmentContextProvider } from '../contexts/AppDevelopmentContext';
import { composeWrappers, type WrapperFunction } from '@studio/testing/composeWrappers';
import { withServicesProvider, withFeatureFlags } from '@studio/testing/providerWrappers';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  startUrl?: string;
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
  featureFlags?: FeatureFlag[];
}

function withAppDevelopmentRouter(startUrl?: string): WrapperFunction {
  return (children: React.ReactNode) => (
    <MemoryRouter basename={APP_DEVELOPMENT_BASENAME} initialEntries={[startUrl]}>
      {children}
    </MemoryRouter>
  );
}

function withAppDevelopmentContext(): WrapperFunction {
  return (children: React.ReactNode) => (
    <AppDevelopmentContextProvider>
      <Routes>
        <Route path='/:org/:app/*' element={children} />
      </Routes>
    </AppDevelopmentContextProvider>
  );
}

export const renderWithProviders = (
  component: any,
  {
    queries = {},
    queryClient,
    startUrl = undefined,
    featureFlags = [],
    ...renderOptions
  }: ExtendedRenderOptions = {},
) => {
  const Wrapper = composeWrappers([
    withFeatureFlags({ featureFlags }),
    withAppDevelopmentRouter(startUrl),
    withServicesProvider({ queries, queryClient }),
    withAppDevelopmentContext(),
  ]);

  return {
    ...render(component, {
      wrapper: Wrapper,
      ...renderOptions,
    }),
  };
};
