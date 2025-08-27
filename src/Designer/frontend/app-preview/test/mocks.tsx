import type { ReactNode } from 'react';
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { Queries, RenderHookOptions } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { MemoryRouter } from 'react-router-dom';
import { PreviewConnectionContextProvider } from 'app-shared/providers/PreviewConnectionContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';

export const renderWithProviders =
  (queries: Partial<ServicesContextProps> = {}, queryClient?: QueryClient) =>
  (component: ReactNode) => {
    const renderResult = render(
      <MemoryRouter>
        <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
          <PreviewConnectionContextProvider>{component}</PreviewConnectionContextProvider>
        </ServicesContextProvider>
      </MemoryRouter>,
    );
    return { renderResult: { ...renderResult } };
  };

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
        <PreviewConnectionContextProvider>{component}</PreviewConnectionContextProvider>
      </ServicesContextProvider>
    </MemoryRouter>
  );

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
  const renderHookOptions: RenderHookOptions<Props, Queries> = {
    wrapper: ({ children }) =>
      externalWrapper(
        wrapper({
          queries,
          queryClient,
        })(children),
      ),
  };
  return renderHook<HookResult, Props, Queries>(hook, renderHookOptions);
}
