// Docs
export const altinnDocsUrl = (relativeUrl: string) => `https://docs.altinn.studio/${relativeUrl}`;
export const giteaEditLink = (org: string, app: string, location: string) =>
  `/repos/${org}/${app}/_edit/master/${location}`;
export const getAppLink = (appPrefix: string, hostname: string, org: string, app: string) =>
  `https://${org}.${appPrefix}.${hostname}/${org}/${app}/`;
