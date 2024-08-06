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
import { PageRouterErrorBoundary } from './PageRouterErrorBoundry';

const BASE_PATH = '/:org/:app';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<App />} errorElement={<PageRouterErrorBoundary />}>
      <Route path={BASE_PATH} element={<PageLayout />} errorElement={<PageRouterErrorBoundary />}>
        {/* Redirects from /:org/:app to child route /overview */}
        <Route
          path={RoutePaths.Root}
          element={<Navigate to={RoutePaths.Overview} />}
          errorElement={<PageRouterErrorBoundary />}
        />
        {routerRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<route.subapp {...route.props} />}
            errorElement={<PageRouterErrorBoundary />}
          />
        ))}
        <Route path='*' element={<NotFoundPage />} errorElement={<PageRouterErrorBoundary />} />
      </Route>
      <Route path='*' element={<NotFoundPage />} errorElement={<PageRouterErrorBoundary />} />
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
