import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import React, { type ReactElement, type ReactNode } from 'react';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { AppRouteParams } from '../types/AppRouteParams';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

type WrapperArgs = {
  appRouteParams: AppRouteParams;
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
};

const defaultAppRouteParams: AppRouteParams = {
  org: 'defaultTestOrg',
  app: 'defaultTestApp',
};

export const renderHookWithProviders = <Result = any, Props = void>(
  hook: (initialProps: Props) => Result,
  {
    appRouteParams = defaultAppRouteParams,
    queries = {},
    queryClient = createQueryClientMock(),
  }: Partial<WrapperArgs> = {},
): RenderHookResult<Result, Props> =>
  renderHook<Result, Props>(hook, {
    wrapper: ({ children }) => (
      <AppRouter params={appRouteParams}>
        <ServicesContextProvider {...queriesMock} {...queries} client={queryClient}>
          {children}
        </ServicesContextProvider>
      </AppRouter>
    ),
  });

type AppRouterProps = {
  params: AppRouteParams;
  children: ReactNode;
};

function AppRouter({ params: { org, app }, children }: AppRouterProps): ReactElement {
  const route = `/${org}/${app}`;
  const path = '/:org/:app';
  return (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    </MemoryRouter>
  );
}
