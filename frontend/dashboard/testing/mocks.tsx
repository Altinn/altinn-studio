import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHook, type RenderOptions } from '@testing-library/react';
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

const wrapper = ({ queries = {}, queryClient = queryClientMock }: WrapperArgs) => {
  const renderComponent = (component: ReactNode) => (
    <MemoryRouter>
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        {component}
      </ServicesContextProvider>
    </MemoryRouter>
  );
  return renderComponent;
};

export interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  queries?: Partial<ServicesContextProps>;
  queryClient?: QueryClient;
}

export const renderHookWithProviders = (
  hook: () => any,
  { queries = {}, queryClient = queryClientMock }: ExtendedRenderOptions = {},
) => {
  return renderHook(hook, {
    wrapper: ({ children }) =>
      wrapper({
        queries,
        queryClient,
      })(children),
  });
};
