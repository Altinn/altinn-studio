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
  isProduction,
  buildStartTime,
  buildFinishTime,
}: {
  org: string;
  env: string;
  app: string;
  isProduction: boolean;
  buildStartTime?: number;
  buildFinishTime?: number;
}) => {
  const baseDomain = isProduction
    ? `https://${org}.apps.altinn.no`
    : `https://${org}.apps.tt02.altinn.no`; // all test environments (tt02, at22, at23, at24 and yt01) use apps.tt02.altinn.no

  const path = `/monitor/d/ae1906c2hbjeoe/pod-console-error-logs`;

  const queryParams = new URLSearchParams({
    'var-rg': `altinnapps-${org}-${isProduction ? 'prod' : env}-rg`,
    'var-PodName': `${org}-${app}-deployment-v2`,
    ...(buildStartTime ? { from: buildStartTime.toString() } : {}),
    ...(buildFinishTime ? { to: buildFinishTime.toString() } : {}),
  }).toString();

  return `${baseDomain}${path}?${queryParams}`;
};

export const getApplicationInsightsTransactionUrl = ({
  subscriptionId,
  org,
  env,
  appName,
  operationNames,
  range,
}: {
  subscriptionId: string;
  org: string;
  env: string;
  appName: string;
  operationNames: string[];
  range: number;
}) => {
  const logsQuery = {
    tables: ['requests'],
    timeContextWhereClause: `| where timestamp >= ago(${range}m)")`,
    filterWhereClause: `| where success == false | where client_Type != 'Browser' | where toint(resultCode) >= 500 | where cloud_RoleName == ${appName} | where operation_Name in ("${operationNames.join('","')}") | order by timestamp desc`,
    originalParams: {
      eventTypes: [{ value: 'request', tableName: 'requests', label: 'Request' }],
      timeContext: { durationMs: range * 60 * 1000 },
      filter: [
        {
          dimension: {
            displayName: 'Successful request',
            tables: ['requests'],
            name: 'request/success',
            draftKey: 'request/success',
          },
          values: ['False'],
          operator: { label: '=', value: '==', isSelected: true },
        },
        {
          dimension: {
            displayName: 'Request Response code',
            tables: ['requests'],
            name: 'request/resultCode',
            draftKey: 'request/resultCode',
          },
          values: ['500'],
          operator: { label: '>=', value: '>=', isSelected: true },
        },
        {
          dimension: {
            displayName: 'Cloud role name',
            tables: ['requests'],
            name: 'cloud/roleName',
            draftKey: 'cloud/roleName',
          },
          values: [appName],
          operator: { label: '=', value: '==', isSelected: true },
        },
        {
          dimension: {
            displayName: 'Operation name',
            tables: ['requests'],
            name: 'operation/name',
            draftKey: 'operation/name',
          },
          values: operationNames,
          operator: { label: '=', value: '==', isSelected: true },
        },
      ],
      searchPhrase: { originalPhrase: '', _tokens: [] },
      sort: 'desc',
    },
  };

  const encodedApplicationInsightsId = encodeURIComponent(
    `/subscriptions/${subscriptionId}/resourceGroups/monitor-${org}-${env}-rg/providers/Microsoft.Insights/components/${org}-${env}-ai`,
  );
  const encodedLogsQuery = encodeURIComponent(JSON.stringify(logsQuery));
  const url = `https://portal.azure.com/#blade/AppInsightsExtension/BladeRedirect/BladeName/searchV1/ResourceId/${encodedApplicationInsightsId}/BladeInputs/${encodedLogsQuery}`;

  return url;
};
