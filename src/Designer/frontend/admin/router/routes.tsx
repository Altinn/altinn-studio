import { RoutePaths } from '../enums/RoutePaths';
import { Apps } from '../features/apps/Apps';
import { InstanceDetails } from '../features/instanceDetails/InstanceDetails';
import { Instances } from '../features/instances/Instances';
import { Overview } from '../features/overview/Overview';
import type { ComponentType } from 'react';

interface RouterRoute {
  path: RoutePaths;
  page: ComponentType;
}

export const routerRoutes: RouterRoute[] = [
  {
    path: RoutePaths.Root,
    page: Overview,
  },
  {
    path: RoutePaths.Apps,
    page: Apps,
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
