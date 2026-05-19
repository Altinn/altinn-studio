import { StudioAlert, StudioHeading } from '@studio/components';
import { AppMetrics } from './components/AppMetrics';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import classes from './AppDetails.module.css';
import { Instances } from '../instances/Instances';
import { AppInfo } from './components/AppInfo';
import { Breadcrumbs } from 'admin/features/apps/components/Breadcrumbs/Breadcrumbs';
import { DEFAULT_SEARCH_PARAMS } from 'admin/constants/constants';
import { useRequiredRoutePathsParams } from 'admin/hooks/useRequiredRoutePathsParams';
import { useAppHealthMetricsQuery } from 'admin/features/apps/hooks/queries/useAppHealthMetricsQuery';
import { isAxiosError } from 'axios';
import { useCurrentOrg } from 'admin/contexts/OrgContext';
import { useEnvironmentTitle } from 'admin/features/apps/hooks/useEnvironmentTitle';
import { useTranslation } from 'react-i18next';

export const AppsDetails = () => {
  const { t } = useTranslation();
  const {
    owner: org,
    environment,
    app,
  } = useRequiredRoutePathsParams(['owner', 'environment', 'app']);
  const defaultRange = DEFAULT_SEARCH_PARAMS.range;
  const [range, setRange] = useQueryParamState<number>('range', defaultRange);

  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const envTitle = useEnvironmentTitle(environment);

  const { isError: healthIsError, error: healthError } = useAppHealthMetricsQuery(
    org,
    environment,
    app,
    {
      hideDefaultError: true,
    },
  );
  const hasNoAccess =
    healthIsError && isAxiosError(healthError) && healthError.response?.status === 403;

  return (
    <div className={classes.container}>
      <Breadcrumbs
        org={org}
        routes={[
          { route: 'apps', environment, range },
          { route: 'app', environment, app, range },
        ]}
      />
      <StudioHeading data-size='lg'>{app}</StudioHeading>
      <AppInfo org={org} environment={environment} app={app} />
      {hasNoAccess ? (
        <StudioAlert data-color='info'>
          {t('admin.app.missing_rights', { envTitle, orgName })}
        </StudioAlert>
      ) : (
        <>
          <div className={classes.metrics}>
            <AppMetrics range={range ?? defaultRange} setRange={setRange} />
          </div>
          <div>
            <Instances />
          </div>
        </>
      )}
    </div>
  );
};
