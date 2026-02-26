import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

interface TestAppRouterProps {
  children: ReactNode;
  initialPath?: string;
  pathTemplate?: string;
}

export function TestAppRouter({
  children,
  initialPath = '/testOrg/testApp',
  pathTemplate = '/:org/:app/*',
}: TestAppRouterProps): ReactElement {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={pathTemplate} element={children} />
      </Routes>
    </MemoryRouter>
  );
}
