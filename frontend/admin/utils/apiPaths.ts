const adminApiBasePath = `/admin/api/v1`;

export const runningAppsPath = (org: string) => `${adminApiBasePath}/applications/${org}`; // Get
export const instancesListPath = (
  org: string,
  env: string,
  app: string,
  continuationToken?: string,
) => {
  const queryString = getQueryStringFromObject({ continuationToken });
  return `${adminApiBasePath}/instances/${org}/${env}/${app}${queryString}`; // Get
};
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
