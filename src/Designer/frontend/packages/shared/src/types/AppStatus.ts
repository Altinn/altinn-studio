export type AppStatus = 'UnderDevelopment' | 'Completed' | 'Deprecated';

export type BuildAppStatus = Exclude<AppStatus, 'Deprecated'>;

export const buildAppStatuses: readonly BuildAppStatus[] = ['UnderDevelopment', 'Completed'];

export const isBuildAppStatus = (status: AppStatus | undefined): status is BuildAppStatus =>
  buildAppStatuses.includes(status as BuildAppStatus);
