import { RoutePaths } from 'admin/enums/RoutePaths';
import { Apps } from 'admin/features/apps/Apps';
import { InstanceDetails } from 'admin/features/instanceDetails/InstanceDetails';
import { Instances } from 'admin/features/instances/Instances';
import { Metrics } from 'admin/features/metrics/Metrics';
import { Overview } from 'admin/features/overview/Overview';
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
    path: RoutePaths.Metrics,
    page: Metrics,
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
