const adminApiBasePath = `/admin/api`;

export const runningAppsPath = (org: string) => `${adminApiBasePath}/applications/${org}`; // Get
export const instancesListPath = (org: string, env: string, app: string) =>
  `${adminApiBasePath}/instances/${org}/${env}/${app}`; // Get
export const instancePath = (org: string, env: string, app: string, instanceId: string) =>
  `${adminApiBasePath}/instances/${org}/${env}/${app}/${instanceId}`; // Get
export const instanceProcessHistoryPath = (
  org: string,
  env: string,
  app: string,
  instanceId: string,
) => `${adminApiBasePath}/instances/${org}/${env}/${app}/${instanceId}/process-history`; // Get
export const instanceEventsPath = (org: string, env: string, app: string, instanceId: string) =>
  `${adminApiBasePath}/instances/${org}/${env}/${app}/${instanceId}/events`; // Get
export const instanceDataElementPath = (
  org: string,
  env: string,
  app: string,
  instanceId: string,
  dataElementId: string,
) => `${adminApiBasePath}/instances/${org}/${env}/${app}/${instanceId}/data/${dataElementId}`; // Get
