import { RoutePaths } from 'admin/enums/RoutePaths';
import { AppsDetails } from 'admin/features/appDetails/AppDetails';
import { Apps } from 'admin/features/apps/Apps';
import { InstanceDetails } from 'admin/features/instanceDetails/InstanceDetails';
import { ContactPoints } from 'admin/settings/pages/contactPoints/ContactPoints';
import type { ComponentType } from 'react';
import { Navigate } from 'react-router-dom';

interface RouterRoute {
  path: RoutePaths;
  page: ComponentType;
}

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.Root,
    page: () => <Navigate to={RoutePaths.Apps} />,
  },
  {
    path: RoutePaths.Apps,
    page: Apps,
  },
  {
    path: RoutePaths.App,
    page: AppsDetails,
  },
  {
    path: RoutePaths.Instance,
    page: InstanceDetails,
  },
  {
    path: RoutePaths.Settings,
    page: () => <Navigate to={RoutePaths.ContactPoints} replace />,
  },
  {
    path: RoutePaths.ContactPoints,
    page: ContactPoints,
  },
];
