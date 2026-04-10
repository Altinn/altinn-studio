import { Navigate, Route } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { RouteErrorBoundary } from '../../../routes/PageRouterErrorBoundary';
import { ContactPoints } from '../pages/ContactPoints/ContactPoints';

export const routes = (
  <Route path={RoutePaths.Org} errorElement={<RouteErrorBoundary />}>
    <Route index element={<Navigate to={RoutePaths.ContactPoints} replace />} />
    <Route
      path={RoutePaths.ContactPoints}
      element={<ContactPoints />}
      errorElement={<RouteErrorBoundary />}
    />
  </Route>
);
