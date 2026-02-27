import type { RenderHookResult } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import React, { type ReactNode } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import type { AppRouteParams } from '../types/AppRouteParams';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { composeWrappers, type WrapperFunction } from '@studio/testing/composeWrappers';
import { withServicesProvider } from '@studio/testing/providerWrappers';

type WrapperArgs = {
  appRouteParams: AppRouteParams;
  queries: Partial<ServicesContextProps>;
  queryClient: QueryClient;
};

const defaultAppRouteParams: AppRouteParams = {
  org: 'defaultTestOrg',
  app: 'defaultTestApp',
};

function withAppRouter(appRouteParams: AppRouteParams): WrapperFunction {
  const { org, app } = appRouteParams;
  const route = `/${org}/${app}`;
  const path = '/:org/:app';
  return (children: ReactNode) => (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    </MemoryRouter>
  );
}

export const renderHookWithProviders = <Result = any, Props = void>(
  hook: (initialProps: Props) => Result,
  {
    appRouteParams = defaultAppRouteParams,
    queries = {},
    queryClient = createQueryClientMock(),
  }: Partial<WrapperArgs> = {},
): RenderHookResult<Result, Props> => {
  const Wrapper = composeWrappers([
    withAppRouter(appRouteParams),
    withServicesProvider({ queries, queryClient }),
  ]);

  return renderHook<Result, Props>(hook, { wrapper: Wrapper });
};
