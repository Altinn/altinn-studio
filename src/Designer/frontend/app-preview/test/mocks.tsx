import type { ReactNode } from 'react';
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { Queries, RenderHookOptions } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { QueryClient } from '@tanstack/react-query';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { composeWrappers } from '@studio/testing/composeWrappers';
import {
  withServicesProvider,
  withPreviewConnection,
  withMemoryRouter,
} from '@studio/testing/providerWrappers';

function createWrappedContent(
  component: ReactNode,
  queries: Partial<ServicesContextProps> = {},
  queryClient?: QueryClient,
) {
  const Wrapper = composeWrappers([
    withMemoryRouter(),
    withServicesProvider({ queries, queryClient }),
    withPreviewConnection(),
  ]);
  return <Wrapper>{component}</Wrapper>;
}

export const renderWithProviders =
  (queries: Partial<ServicesContextProps> = {}, queryClient?: QueryClient) =>
  (component: ReactNode) => {
    const renderResult = render(createWrappedContent(component, queries, queryClient));
    return { renderResult: { ...renderResult } };
  };

export interface ProviderData {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
  externalWrapper?: (children: ReactNode) => ReactNode;
}

export function renderHookWithProviders<HookResult, Props>(
  hook: (props: Props) => HookResult,
  {
    queries = {},
    queryClient = queryClientMock,
    externalWrapper = (children) => children,
  }: ProviderData = {},
) {
  const ProviderWrapper = composeWrappers([
    withMemoryRouter(),
    withServicesProvider({ queries, queryClient }),
    withPreviewConnection(),
  ]);
  const renderHookOptions: RenderHookOptions<Props, Queries> = {
    wrapper: ({ children }) => externalWrapper(<ProviderWrapper>{children}</ProviderWrapper>),
  };
  return renderHook<HookResult, Props, Queries>(hook, renderHookOptions);
}
