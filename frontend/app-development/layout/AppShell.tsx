import React from 'react';
import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { PageHeader } from './PageHeader';

/**
 * Displays the layout for the app development pages
 */
export const AppShell = (): React.ReactNode => {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const { org, app } = match.params;

  return (
    <>
      <PageHeader org={org} app={app} />
      <Outlet />
    </>
  );
};
