import React from 'react';
import classes from './Layout.module.css';
import { Outlet, Route, Routes, matchPath, useLocation } from 'react-router-dom';
import { routes } from 'app-development/config/routes';
import { Center } from 'app-shared/components/Center';
import { PageHeader } from './PageHeader';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';

export const Layout = (): React.ReactNode => {
  const { pathname } = useLocation();
  const match = matchPath({ path: '/:org/:app', caseSensitive: true, end: false }, pathname);
  const { org, app } = match.params;

  const { data: repoStatus, error: repoStatusError } = useRepoStatusQuery(org, app);

  console.log('repoStatusError', repoStatusError);

  // Idea to solve issue with not found on org and app
  // - do query calls to 'useOrganizationQuery' and 'useUserQuery'.
  // - case 'loading': return Spinner
  // - case 'error': Display error message (and potentially the 404 page IF there is a 404 error)
  // - case 'success': return the app/outlet

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
// - Make it possible to get to error page when org or url is wrong
export const PageRoutes = () => {
  return (
    <div className={classes.root}>
      <Routes>
        <Route path={basePath} element={<Layout />}>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={<route.subapp {...route.props} />} />
          ))}
          <Route path='*' element={<Center>TODO - Replace with Ugyldig address</Center>} />
        </Route>
        <Route path='*' element={<Center>TODO - Replace with Ugyldig address</Center>} />
      </Routes>
    </div>
  );
};
