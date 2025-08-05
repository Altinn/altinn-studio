export enum RoutePaths {
  Root = '',
  Apps = 'apps',
  App = 'apps/:env/:app/',
  Instances = 'apps/:env/:app/instances',
  Instance = 'apps/:env/:app/instances/:instanceId',
  Exceptions = 'apps/:env/:app/exceptions',
  FailedRequests = 'apps/:env/:app/failed-requests',
  Errors = 'apps/:env/:app/errors',
}
