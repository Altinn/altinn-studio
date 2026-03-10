import React, { Suspense } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { App } from 'app-development/layout/App';
import { PageLayout } from 'app-development/layout/PageLayout';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { routerRoutes } from 'app-development/router/routes';
import { NotFoundPage } from 'app-development/layout/NotFoundPage';
import { NotFoundRouteErrorBoundary, RouteErrorBoundary } from './PageRouterErrorBoundry';
import { GiteaRoutePaths } from '../enums/GiteaRoutePaths';
import { NavigateToLatestCommitInGitea } from '../features/navigateToLatestCommitInGitea';
import { StudioPageSpinner } from '@studio/components';

const BASE_PATH = '/:org/:app';

export const routes = (
  <Route element={<App />}>
    <Route path={BASE_PATH} element={<PageLayout />} errorElement={<RouteErrorBoundary />}>
      <Route
        path={RoutePaths.Root}
        element={<Navigate to={RoutePaths.Overview} />}
        errorElement={<RouteErrorBoundary />}
      />
      {routerRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <Suspense fallback={<StudioPageSpinner spinnerTitle='' />}>
              <route.subapp />
            </Suspense>
          }
          errorElement={<RouteErrorBoundary />}
        />
      ))}
      <Route path='*' element={<NotFoundPage />} errorElement={<NotFoundRouteErrorBoundary />} />
    </Route>
    <Route path={BASE_PATH}>
      <Route
        path={GiteaRoutePaths.LatestCommit}
        element={<NavigateToLatestCommitInGitea />}
        errorElement={<RouteErrorBoundary />}
      />
    </Route>
  </Route>
);
