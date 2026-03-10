import React from 'react';
import { Route } from 'react-router-dom';
import { App } from 'admin/layout/App';
import { PageLayout } from 'admin/layout/PageLayout';
import { NotFoundPage } from 'admin/layout/NotFoundPage';
import { NotFoundRouteErrorBoundary, RouteErrorBoundary } from './PageRouterErrorBoundary';
import { routerRoutes } from './routes';

const BASE_PATH = '/:org';

export const routes = (
  <Route element={<App />}>
    <Route path={BASE_PATH} element={<PageLayout />} errorElement={<RouteErrorBoundary />}>
      {routerRoutes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={<route.page />}
          errorElement={<RouteErrorBoundary />}
        />
      ))}
      <Route path='*' element={<NotFoundPage />} errorElement={<NotFoundRouteErrorBoundary />} />
    </Route>
  </Route>
);
