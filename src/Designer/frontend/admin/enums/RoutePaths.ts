export enum RoutePaths {
  Root = '',
  Apps = 'apps',
  App = 'apps/:environment/:app/',
  Instances = 'apps/:environment/:app/instances',
  Instance = 'apps/:environment/:app/instances/:instanceId',
}
