import { RoutePaths } from 'admin/enums/RoutePaths';
import { AppsDetails } from 'admin/features/appDetails/AppDetails';
import { Apps } from 'admin/features/apps/Apps';
import { InstanceDetails } from 'admin/features/instanceDetails/InstanceDetails';
import { Instances } from 'admin/features/instances/Instances';
import type { ComponentType } from 'react';
import { Navigate } from 'react-router-dom';

interface RouterRoute {
  path: RoutePaths;
  page: ComponentType;
}

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.Root,
    page: () => <Navigate to={'apps'} />,
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
    path: RoutePaths.Instances,
    page: Instances,
  },
  {
    path: RoutePaths.Instance,
    page: InstanceDetails,
  },
];
