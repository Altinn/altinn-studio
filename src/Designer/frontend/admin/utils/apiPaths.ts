const adminApiBasePath = `/designer/api/admin`;

export const appHealthMetricsPath = (org: string, env: string, app: string) =>
  `${adminApiBasePath}/metrics/${org}/${env}/app/health?app=${app}`; // Get
export const appMetricsPath = (org: string, env: string, app: string, range: number) =>
  `${adminApiBasePath}/metrics/${org}/${env}/app?app=${app}&range=${range}`; // Get
export const metricsPath = (org: string, env: string, range: number) =>
  `${adminApiBasePath}/metrics/${org}/${env}?range=${range}`; // Get
export const runningAppsPath = (org: string) => `${adminApiBasePath}/applications/${org}`; // Get
export const instancesListPath = (
  org: string,
  env: string,
  app: string,
  continuationToken?: string,
  currentTask?: string,
  isArchived?: boolean,
  archiveReference?: string,
  confirmed?: boolean,
  isSoftDeleted?: boolean,
  isHardDeleted?: boolean,
  createdBefore?: string,
) => {
  const queryString = getQueryStringFromObject({
    continuationToken,
    currentTask,
    isArchived: typeof isArchived === 'boolean' ? String(isArchived) : null,
    archiveReference,
    confirmed: typeof confirmed === 'boolean' ? String(confirmed) : null,
    isSoftDeleted: typeof isSoftDeleted === 'boolean' ? String(isSoftDeleted) : null,
    isHardDeleted: typeof isHardDeleted === 'boolean' ? String(isHardDeleted) : null,
    createdBefore,
  });
  return `${adminApiBasePath}/instances/${org}/${env}/${app}${queryString}`; // Get
};
export const appProcessTasksPath = (org: string, env: string, app: string) =>
  `${adminApiBasePath}/applications/${org}/${env}/${app}/process-tasks`; // Get
export const instanceDetailsPath = (org: string, env: string, app: string, instanceId: string) =>
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

/**
 * Returns an encoded query string from a key-value object, or an empty string if the object is empty.
 * Also removes parameters that are empty, null, or undefined.
 * Example: { a: 'b', c: 'd' } => '?a=b&c=d'
 * Example: {} => ''
 * Example: { a: 'b', c: null } => '?a=b'
 */
function getQueryStringFromObject(obj: Record<string, string | null | undefined>): string {
  const cleanObj = Object.fromEntries(Object.entries(obj).filter(([_, value]) => !!value));
  const queryParams = new URLSearchParams(cleanObj);
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}
