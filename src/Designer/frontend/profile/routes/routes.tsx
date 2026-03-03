import type { ComponentType } from 'react';
import { Navigate } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { Keys } from 'profile/pages/Keys/Keys';

interface RouterRoute {
  path: RoutePaths;
  page: ComponentType;
}

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.Root,
    page: () => <Navigate to={RoutePaths.Keys} />,
  },
  {
    path: RoutePaths.Keys,
    page: Keys,
  },
];
