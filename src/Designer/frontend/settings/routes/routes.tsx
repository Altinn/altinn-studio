import type { ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { PersonalAccessTokens } from '../pages/PersonalAccessTokens/PersonalAccessTokens';

interface RouterRoute {
  path: RoutePaths;
  page: ComponentType;
}

const RedirectToPersonalAccessTokens = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: RoutePaths.PersonalAccessTokens, search }} />;
};

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.Root,
    page: RedirectToPersonalAccessTokens,
  },
  {
    path: RoutePaths.PersonalAccessTokens,
    page: PersonalAccessTokens,
  },
];
