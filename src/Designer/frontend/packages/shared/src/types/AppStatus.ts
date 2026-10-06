export type AppStatus = 'UnderDevelopment' | 'Completed' | 'Deprecated';

export type DeployAppStatus = Exclude<AppStatus, 'Deprecated'>;

export const deployAppStatuses: readonly DeployAppStatus[] = ['UnderDevelopment', 'Completed'];

export const isDeployAppStatus = (status: AppStatus | undefined): status is DeployAppStatus =>
  deployAppStatuses.includes(status as DeployAppStatus);
