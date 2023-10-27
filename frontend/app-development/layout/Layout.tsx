import React from 'react';
import classes from './Layout.module.css';
import { Outlet, Route, Routes, matchPath, useLocation } from 'react-router-dom';
import { routes } from 'app-development/config/routes';
import { Center } from 'app-shared/components/Center';
import { PageHeader } from './PageHeader';
import { RoutePaths } from 'app-development/enums/RoutePaths';

export const Layout = (): React.ReactNode => {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const { org, app } = match.params;

  // clean up the URL so that it becomes only the route path
  const pathNameWithoutOrgAndApp: RoutePaths = pathname
    .replace(org, '')
    .replace(app, '')
    .replaceAll('/', '') as RoutePaths;

  return (
    <>
      <PageHeader org={org} app={app} activeRoute={pathNameWithoutOrgAndApp} />
      <Outlet />
    </>
  );
};

const basePath = '/:org/:app';

// TODO:
// - Legge på MergeConflict Handling
// - Move the component to its own place
export const PageRoutes = () => (
  <div className={classes.root}>
    <Routes>
      <Route path={basePath} element={<Layout />}>
        {routes.map((route) => (
          <Route key={route.path} path={route.path} element={<route.subapp {...route.props} />} />
        ))}
        <Route path='*' element={<Center>TODO - Replace with NotFoundPage</Center>} />
      </Route>
      <Route path='*' element={<Center>TODO - Replace with NotFoundPage</Center>} />
    </Routes>
  </div>
);
