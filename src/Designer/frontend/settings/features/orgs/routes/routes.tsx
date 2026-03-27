import { Navigate, Route } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { PageLayout } from '../layout/PageLayout';
import { RouteErrorBoundary } from '../../../routes/PageRouterErrorBoundary';
import { ContactPoints } from '../pages/ContactPoints/ContactPoints';

export const routes = (
  <Route path={RoutePaths.Org} element={<PageLayout />} errorElement={<RouteErrorBoundary />}>
    <Route index element={<Navigate to={RoutePaths.ContactPoints} replace />} />
    <Route
      path={RoutePaths.ContactPoints}
      element={<ContactPoints />}
      errorElement={<RouteErrorBoundary />}
    />
  </Route>
);
