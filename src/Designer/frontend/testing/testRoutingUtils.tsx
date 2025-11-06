import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AppRouteParams } from 'app-shared/types/AppRouteParams';
import { app as testApp, org as testOrg } from '@studio/testing/testids';

export const defaultTestRouteParams: AppRouteParams = {
  org: testOrg,
  app: testApp,
};

interface TestAppRouterProps {
  params?: Partial<AppRouteParams>;
  children: ReactNode;
  initialPath?: string;
}

export function TestAppRouter({
  params = defaultTestRouteParams,
  children,
  initialPath,
}: TestAppRouterProps): ReactElement {
  const { org, app } = { ...defaultTestRouteParams, ...params };
  const route = initialPath || `/${org}/${app}`;
  const path = '/:org/:app/*';

  return (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    </MemoryRouter>
  );
}
