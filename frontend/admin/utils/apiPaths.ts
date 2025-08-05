const adminApiBasePath = `/admin/api/v1`;

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
export const appExceptionsPath = (org: string, env: string, app: string) =>
  `http://localhost:5004/api/v1/appexceptions?time=24`; // Get
export const appFailedRequestsPath = (org: string, env: string, app: string) =>
  `http://localhost:5004/api/v1/appfailedrequests?time=24`; // Get
export const containerLogsPath = (org: string, env: string, app: string) =>
  `http://localhost:5004/api/v1/containerlogs?time=24`; // Get
