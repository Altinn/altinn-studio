import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { Queries, RenderHookOptions, RenderOptions } from '@testing-library/react';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import type { MemoryRouterProps } from 'react-router-dom';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import type { FeatureFlag } from '@studio/feature-flags';
import { composeWrappers } from '@studio/testing/composeWrappers';
import {
  withMemoryRouter,
  withServicesProvider,
  withFeatureFlags,
} from '@studio/testing/providerWrappers';

type WrapperArgs = {
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
  featureFlags: FeatureFlag[];
} & Pick<MemoryRouterProps, 'initialEntries'>;

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
  const Wrapper = composeWrappers([
    withMemoryRouter({ initialEntries }),
    withServicesProvider({ queries, queryClient }),
    withFeatureFlags({ featureFlags }),
  ]);

  const renderOptions: RenderOptions = { wrapper: Wrapper };
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
  const ProviderWrapper = composeWrappers([
    withMemoryRouter({ initialEntries }),
    withServicesProvider({ queries, queryClient }),
    withFeatureFlags({ featureFlags }),
  ]);
  const renderHookOptions: RenderHookOptions<Props, Queries> = {
    wrapper: ({ children }) => externalWrapper(<ProviderWrapper>{children}</ProviderWrapper>),
  };
  return renderHook<HookResult, Props, Queries>(hook, renderHookOptions);
}
