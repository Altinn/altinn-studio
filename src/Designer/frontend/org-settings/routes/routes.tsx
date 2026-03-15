import type { ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { RoutePaths } from './RoutePaths';
import { ContactPoints } from '../pages/ContactPoints/ContactPoints';

interface RouterRoute {
  path: RoutePaths;
  page: ComponentType;
}

const RedirectToContactPoints = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: RoutePaths.ContactPoints, search }} />;
};

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.Root,
    page: RedirectToContactPoints,
  },
  {
    path: RoutePaths.ContactPoints,
    page: ContactPoints,
  },
];
