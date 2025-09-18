export enum RoutePaths {
  Root = '',
  Apps = 'apps',
  App = 'apps/:env/:app/',
  Metrics = 'apps/:env/:app/metrics',
  Instances = 'apps/:env/:app/instances',
  Instance = 'apps/:env/:app/instances/:instanceId',
}
