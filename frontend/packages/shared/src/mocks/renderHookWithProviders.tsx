import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import React from 'react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

type WrapperArgs = {
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
};

export const renderHookWithProviders = <Result = any, Props = void>(
  hook: (initialProps: Props) => Result,
  { queries = {}, queryClient = createQueryClientMock() }: Partial<WrapperArgs> = {},
): RenderHookResult<Result, Props> =>
  renderHook<Result, Props>(hook, {
    wrapper: ({ children }) => (
      <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
        {children}
      </ServicesContextProvider>
    ),
  });
