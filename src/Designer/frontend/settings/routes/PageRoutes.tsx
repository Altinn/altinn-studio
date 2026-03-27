import React from 'react';
import {
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  Navigate,
} from 'react-router-dom';
import { SETTINGS_BASENAME } from 'app-shared/constants';
import { AppRouteErrorBoundary, NotFoundRouteErrorBoundary } from './PageRouterErrorBoundary';
import { routes as userRoutes } from '../features/user/routes/routes';
import { routes as orgRoutes } from '../features/orgs/routes/routes';
import { NotFound } from '../pages/NotFound/NotFound';
import { PageLayout } from '../layout/PageLayout';
import { RoutePaths } from '../features/user/routes/RoutePaths';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<PageLayout />} errorElement={<AppRouteErrorBoundary />}>
      <Route index element={<Navigate to={RoutePaths.User} replace />} />
      {userRoutes}
      {orgRoutes}
      <Route path='*' element={<NotFound />} errorElement={<NotFoundRouteErrorBoundary />} />
    </Route>,
  ),
  {
    basename: SETTINGS_BASENAME,
  },
);

export const PageRoutes = (): React.ReactElement => <RouterProvider router={router} />;
