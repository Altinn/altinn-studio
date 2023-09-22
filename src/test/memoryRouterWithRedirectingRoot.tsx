import React from 'react';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';

interface MemoryRouterWithRedirectingRootParams {
  initialEntries?: string[];
  basename?: string;
  element?: JSX.Element | JSX.Element[] | null;
  to: string;
  children: JSX.Element | JSX.Element[] | null;
}

export function MemoryRouterWithRedirectingRoot({
  initialEntries = [''],
  basename = '/ttd/test',
  element = null,
  to,
  children,
}: MemoryRouterWithRedirectingRootParams) {
  const Relocate = ({ navPath }) => (
    <Navigate
      to={navPath}
      replace
    />
  );
  return (
    <MemoryRouter
      initialEntries={initialEntries.map((e) => `${basename}${e}`)}
      basename={basename}
    >
      {element}
      <Routes>
        <Route
          path={'/'}
          element={<Relocate navPath={to} />}
        />
        {children}
      </Routes>
    </MemoryRouter>
  );
}
