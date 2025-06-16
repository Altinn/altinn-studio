import { PROD_ENV_TYPE } from './constants';

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

export const grafanaPodLogsUrl = ({
  org,
  env,
  app,
  buildStartTime,
  buildFinishTime,
}: {
  org: string;
  env: string;
  app: string;
  buildStartTime: number;
  buildFinishTime: number;
}) => {
  const envLower = env.toLowerCase();
  const isProduction = envLower === PROD_ENV_TYPE;

  const baseDomain = isProduction
    ? `https://${org}.apps.altinn.no`
    : `https://${org}.apps.tt02.altinn.no`; // all test environments (tt02, at22, at23, at24 and yt01) use apps.tt02.altinn.no

  const path = `/monitor/d/ae1906c2hbjeoe/pod-console-error-logs`;

  const queryParams = new URLSearchParams({
    'var-rg': `altinnapps-${org}-${isProduction ? 'prod' : envLower}-rg`,
    'var-PodName': `${org}-${app}-v2`,
    from: buildStartTime.toString(),
    to: buildFinishTime.toString(),
  }).toString();

  return `${baseDomain}${path}?${queryParams}`;
};
