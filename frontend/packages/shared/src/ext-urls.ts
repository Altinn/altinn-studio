// Docs
export const altinnDocsUrl = (props: { relativeUrl?: string; language?: 'nb' | 'en' } = {}) => {
  const { relativeUrl = '', language = 'nb' } = props;
  // This check is in place until docs are updated to use the same
  // structure for all languages in URL. When that is done, we can remove the check and
  // use the URL that includes language code only.
  return language === 'nb'
    ? `https://docs.altinn.studio/${language}/${relativeUrl}`
    : `https://docs.altinn.studio/${relativeUrl}`;
};

export const giteaEditLink = (org: string, app: string, location: string) =>
  `/repos/${org}/${app}/_edit/master/${location}`;

export const getAppLink = (appPrefix: string, hostname: string, org: string, app: string) =>
  `https://${org}.${appPrefix}.${hostname}/${org}/${app}/`;

export const gitHubRoadMapUrl = 'https://github.com/orgs/digdir/projects/8/views/2';
