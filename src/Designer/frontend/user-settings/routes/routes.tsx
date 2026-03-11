import type { ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { ApiKeys } from '../pages/ApiKeys/ApiKeys';

interface RouterRoute {
  path: RoutePaths;
  page: ComponentType;
}

const RedirectToApiKeys = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: RoutePaths.ApiKeys, search }} />;
};

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.Root,
    page: RedirectToApiKeys,
  },
  {
    path: RoutePaths.Settings,
    page: RedirectToApiKeys,
  },
  {
    path: RoutePaths.ApiKeys,
    page: ApiKeys,
  },
];
