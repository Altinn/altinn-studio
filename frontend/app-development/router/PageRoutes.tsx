import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
} from 'react-router-dom';
import { AppShell } from 'app-development/layout/AppShell';
import { PageLayout } from 'app-development/layout/PageLayout';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { routerRoutes } from 'app-development/router/routes';
import { StudioNotFoundPage } from '@studio/components';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

const BASE_PATH = '/:org/:app';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<AppShell />}>
      <Route path={BASE_PATH} element={<PageLayout />}>
        {/* Redirects from /:org/:app to child route /overview */}
        <Route path={RoutePaths.Root} element={<Navigate to={RoutePaths.Overview} />} />
        {routerRoutes.map((route) => (
          <Route key={route.path} path={route.path} element={<route.subapp {...route.props} />} />
        ))}
        <Route path='*' element={<StudioNotFoundPage />} />
      </Route>
      <Route path='*' element={<StudioNotFoundPage />} />
    </Route>,
  ),
  {
    basename: APP_DEVELOPMENT_BASENAME,
  },
);

/**
 * Displays the routes for app development pages
 */
export const PageRoutes = () => <RouterProvider router={router} />;
