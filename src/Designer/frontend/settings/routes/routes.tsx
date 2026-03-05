import type { ComponentType } from 'react';
import { Navigate } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { PersonalAccessTokens } from '../pages/PersonalAccessTokens/PersonalAccessTokens';

interface RouterRoute {
  path: RoutePaths;
  page: ComponentType;
}

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.Root,
    page: () => <Navigate to={RoutePaths.PersonalAccessTokens} />,
  },
  {
    path: RoutePaths.PersonalAccessTokens,
    page: PersonalAccessTokens,
  },
];
