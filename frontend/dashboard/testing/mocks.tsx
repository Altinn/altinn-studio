import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { Queries, RenderHookOptions, RenderOptions } from '@testing-library/react';
import { render, renderHook } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';

type WrapperArgs = {
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
};

const wrapper =
  ({ queries = {}, queryClient = queryClientMock }: WrapperArgs) =>
  // eslint-disable-next-line react/display-name
  (component: ReactNode) => (
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        {component}
      </ServicesContextProvider>
    </MemoryRouter>
  );

export interface ProviderData {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  component: ReactNode,
  { queries = {}, queryClient = queryClientMock }: ProviderData = {},
) {
  const renderOptions: RenderOptions = {
    wrapper: ({ children }) =>
      wrapper({
        queries,
        queryClient,
      })(children),
  };
  return render(component, renderOptions);
}

export function renderHookWithProviders<HookResult, Props>(
  hook: (props: Props) => HookResult,
  { queries = {}, queryClient = queryClientMock }: ProviderData = {},
) {
  const renderHookOptions: RenderHookOptions<Props, Queries> = {
    wrapper: ({ children }) =>
      wrapper({
        queries,
        queryClient,
      })(children),
  };
  return renderHook<HookResult, Props, Queries>(hook, renderHookOptions);
}
