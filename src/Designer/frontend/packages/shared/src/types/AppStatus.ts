export type AppStatus = 'UnderDevelopment' | 'Completed' | 'Deprecated';

export type DeployAppStatus = Exclude<AppStatus, 'Deprecated'>;
