import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
} from 'react-router-dom';
import { App } from 'app-development/layout/App';
import { PageLayout } from 'app-development/layout/PageLayout';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { routerRoutes } from 'app-development/router/routes';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { NotFoundPage } from 'app-development/layout/NotFoundPage';
import {
  AppRouteErrorBoundary,
  NotFoundRouteErrorBoundary,
  RouteErrorBoundary,
} from './PageRouterErrorBoundry';
import { LatestCommit } from 'app-development/features/latestCommit';

const BASE_PATH = '/:org/:app';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<App />} errorElement={<AppRouteErrorBoundary />}>
      <Route path={BASE_PATH} errorElement={<RouteErrorBoundary />}>
        <Route element={<PageLayout />}>
          {/* Redirects from /:org/:app to child route /overview */}
          <Route
            path={RoutePaths.Root}
            element={<Navigate to={RoutePaths.Overview} />}
            errorElement={<RouteErrorBoundary />}
          />
          {routerRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<route.subapp {...route.props} />}
              errorElement={<RouteErrorBoundary />}
            />
          ))}
        </Route>
        <Route
          path='latest-commit'
          element={<LatestCommit />}
          errorElement={<NotFoundRouteErrorBoundary />}
        />
        <Route path='*' element={<NotFoundPage />} errorElement={<NotFoundRouteErrorBoundary />} />
      </Route>
      <Route path='*' element={<NotFoundPage />} errorElement={<NotFoundRouteErrorBoundary />} />
    </Route>,
  ),
  {
    basename: APP_DEVELOPMENT_BASENAME,
  },
);

/**
 * Displays the routes for app development pages
 */
export const PageRoutes = (): React.ReactElement => <RouterProvider router={router} />;
