import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { Queries, RenderHookOptions, RenderOptions } from '@testing-library/react';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import type { MemoryRouterProps } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { FeatureFlagsContextProvider } from '@studio/feature-flags';
import type { FeatureFlag } from '@studio/feature-flags';

type WrapperArgs = {
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
  featureFlags: FeatureFlag[];
} & Pick<MemoryRouterProps, 'initialEntries'>;

const wrapper =
  ({
    queries = {},
    queryClient = createQueryClientMock(),
    featureFlags = [],
    initialEntries,
  }: WrapperArgs) =>
  // eslint-disable-next-line react/display-name
  (component: ReactNode) => (
    <MemoryRouter initialEntries={initialEntries}>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        <FeatureFlagsContextProvider value={{ flags: featureFlags }}>
          {component}
        </FeatureFlagsContextProvider>
      </ServicesContextProvider>
    </MemoryRouter>
  );

export interface ProviderData extends Partial<WrapperArgs> {
  externalWrapper?: (children: ReactNode) => ReactNode;
}

export function renderWithProviders(
  component: ReactNode,
  {
    queries = {},
    queryClient = createQueryClientMock(),
    featureFlags = [],
    initialEntries,
  }: ProviderData = {},
) {
  const renderOptions: RenderOptions = {
    wrapper: ({ children }) =>
      wrapper({
        queries,
        queryClient,
        featureFlags,
        initialEntries,
      })(children),
  };
  return render(component, renderOptions);
}

export function renderHookWithProviders<HookResult, Props>(
  hook: (props: Props) => HookResult,
  {
    queries = {},
    queryClient = createQueryClientMock(),
    externalWrapper = (children) => children,
    featureFlags = [],
    initialEntries,
  }: ProviderData = {},
) {
  const renderHookOptions: RenderHookOptions<Props, Queries> = {
    wrapper: ({ children }) =>
      externalWrapper(
        wrapper({
          queries,
          queryClient,
          featureFlags,
          initialEntries,
        })(children),
      ),
  };
  return renderHook<HookResult, Props, Queries>(hook, renderHookOptions);
}
