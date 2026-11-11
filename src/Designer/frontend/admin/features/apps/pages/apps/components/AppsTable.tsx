import { useRunningAppsQuery } from 'admin/features/apps/hooks/queries/useRunningAppsQuery';
import { useEnvironmentTitle } from 'admin/features/apps/hooks/useEnvironmentTitle';
import classes from './AppsTable.module.css';
import type { PublishedApplication } from 'admin/features/apps/types/PublishedApplication';
import {
  StudioSpinner,
  StudioTable,
  StudioSearch,
  StudioError,
  StudioTabs,
  StudioAlert,
  StudioSkeleton,
} from '@studio/components';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import { useErrorMetricsQuery } from 'admin/features/apps/hooks/queries/useErrorMetricsQuery';
import { TimeRangeSelect } from 'admin/features/apps/components/TimeRangeSelect/TimeRangeSelect';
import { Alert } from 'admin/features/apps/components/Alert/Alert';
import { isAxiosError } from 'axios';
import { useCurrentOrg } from 'admin/contexts/OrgContext';
import { createSearchParams, DEFAULT_SEARCH_PARAMS } from 'admin/constants/constants';
import { usePublishedAppStatusesQuery } from 'admin/features/apps/hooks/queries/usePublishedAppStatusesQuery';
import type { ErrorMetric } from 'admin/features/apps/types/metrics/ErrorMetric';
import type { AppStatus } from 'admin/features/apps/components/AppStatusTag/AppStatusTag';
import {
  AppStatusHeader,
  AppStatusTag,
  needsAttention,
} from 'admin/features/apps/components/AppStatusTag/AppStatusTag';

export type AppsTableProps = {
  org: string;
};

export const AppsTable = ({ org }: AppsTableProps) => {
  const { data, status } = useRunningAppsQuery(org);
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <AppsTableWithData org={org} runningApps={data} />;
  }
};

type AppsTableWithDataProps = {
  runningApps: Record<string, PublishedApplication[]>;
  org: string;
};

const environmentOrder = ['production', 'tt02', 'at22', 'at23', 'at24', 'yt01'];

const sortEnvironments = (a: string, b: string) => {
  const indexA = environmentOrder.indexOf(a);
  const indexB = environmentOrder.indexOf(b);
  return indexA - indexB;
};

const AppsTableWithData = ({ org, runningApps }: AppsTableWithDataProps) => {
  const { t } = useTranslation();
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const [search, setSearch] = useQueryParamState<string>('appSearch', '');
  const [selectedEnvironment, setSelectedEnvironment] = useQueryParamState<string>(
    'environment',
    DEFAULT_SEARCH_PARAMS.environment,
  );

  const availableEnvironments = Object.keys(runningApps).toSorted(sortEnvironments);

  const activeEnvironment =
    selectedEnvironment && availableEnvironments.includes(selectedEnvironment)
      ? selectedEnvironment
      : availableEnvironments[0];

  useEffect(() => {
    if (activeEnvironment && activeEnvironment !== selectedEnvironment) {
      setSelectedEnvironment(activeEnvironment);
    }
  }, [activeEnvironment, selectedEnvironment, setSelectedEnvironment]);

  if (!availableEnvironments.length) {
    return (
      <StudioAlert data-color='info'>{t('admin.environment.no_results', { orgName })}</StudioAlert>
    );
  }

  return (
    <StudioTabs value={activeEnvironment} onChange={setSelectedEnvironment}>
      <StudioTabs.List>
        {availableEnvironments.map((environment) => (
          <StudioTabs.Tab key={environment} value={environment}>
            {t('admin.environment.name', { environment })} ({runningApps[environment].length})
          </StudioTabs.Tab>
        ))}
      </StudioTabs.List>
      {availableEnvironments.map((environment) => (
        <StudioTabs.Panel key={environment} value={environment}>
          <AppsTableContent
            key={environment}
            org={org}
            environment={environment}
            search={search}
            setSearch={setSearch}
            runningApps={runningApps}
          />
        </StudioTabs.Panel>
      ))}
    </StudioTabs>
  );
};

type AppsTableContentProps = AppsTableWithDataProps & {
  environment: string;
  search?: string;
  setSearch: (newState: string) => void;
};

const AppsTableContent = ({
  org,
  environment,
  search,
  setSearch,
  runningApps,
}: AppsTableContentProps) => {
  const { t } = useTranslation();
  const envTitle = useEnvironmentTitle(environment);
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const [range, setRange] = useQueryParamState<number>('range', DEFAULT_SEARCH_PARAMS.range);
  const {
    data: errorMetrics,
    isPending: errorMetricsIsPending,
    error: errorMetricsError,
    isError: errorMetricsIsError,
  } = useErrorMetricsQuery(org, environment, range!, {
    hideDefaultError: true,
  });
  const { data: appStatuses, status: appStatusesStatus } = usePublishedAppStatusesQuery(
    org,
    environment,
  );

  const renderErrorsMetricsHeaderCell = () => {
    return (
      <>
        {errorMetricsIsPending && <StudioSpinner aria-label={t('admin.metrics.errors.loading')} />}

        <TimeRangeSelect
          label={t('admin.metrics.errors')}
          value={range!}
          onChange={(e) => setRange(e)}
        />
      </>
    );
  };

  return (
    <>
      {errorMetricsIsError &&
        (isAxiosError(errorMetricsError) && errorMetricsError.response?.status === 403 ? (
          <StudioAlert data-color='info' className={classes.errorAlert}>
            {t('admin.metrics.errors.missing_rights', { envTitle, orgName })}
          </StudioAlert>
        ) : (
          <StudioError className={classes.errorAlert}>
            {t('admin.metrics.errors.error')}
          </StudioError>
        ))}
      <StudioSearch
        className={classes.appSearch}
        value={search ?? ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        label={t('admin.apps.search')}
      />
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.Cell>{t('admin.apps.name')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.app.info.app_version')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.app.info.backend_version')}</StudioTable.Cell>
            <StudioTable.Cell>
              <AppStatusHeader />
            </StudioTable.Cell>
            <StudioTable.Cell className={classes.errorMetricsHeaderCell}>
              {renderErrorsMetricsHeaderCell()}
            </StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {runningApps[environment]
            .filter((app) => !search || app.app.toLowerCase().includes(search.toLowerCase()))
            .map((app) => {
              const appErrorMetrics = errorMetrics?.filter((metric) => metric.appName === app.app);
              const appStatus = appStatuses?.get(app.app);
              const status: AppStatus = appStatus?.status ?? 'unknown';
              return {
                ...app,
                metrics: appErrorMetrics,
                appStatus,
                status,
                needsAttention: (appErrorMetrics?.length ?? 0) > 0 || needsAttention(status),
              };
            })
            .sort(
              (a, b) =>
                Number(b.needsAttention) - Number(a.needsAttention) || a.app.localeCompare(b.app),
            )
            .map((app) => (
              <StudioTable.Row key={app.app}>
                <StudioTable.Cell>
                  <Link to={`${environment}/${app.app}${createSearchParams({ range })}`}>
                    {app.app}
                  </Link>
                </StudioTable.Cell>
                <StudioTable.Cell>{app.version}</StudioTable.Cell>
                <StudioTable.Cell>
                  <AppStatusCell
                    queryStatus={appStatusesStatus}
                    render={() => app.appStatus?.appLibVersion ?? '-'}
                  />
                </StudioTable.Cell>
                <StudioTable.Cell>
                  <AppStatusCell
                    queryStatus={appStatusesStatus}
                    render={() => <AppStatusTag status={app.status} />}
                  />
                </StudioTable.Cell>
                <StudioTable.Cell className={classes.errorMetricsCell}>
                  <ErrorMetricsCell
                    isPending={errorMetricsIsPending}
                    isError={errorMetricsIsError}
                    metrics={app.metrics}
                  />
                </StudioTable.Cell>
              </StudioTable.Row>
            ))}
        </StudioTable.Body>
      </StudioTable>
    </>
  );
};

type AppStatusCellProps = {
  queryStatus: 'pending' | 'error' | 'success';
  render: () => React.ReactNode;
};

/** A cell filled from the environment's app statuses: a skeleton until they arrive, a dash if they do not. */
const AppStatusCell = ({ queryStatus, render }: AppStatusCellProps) => {
  const { t } = useTranslation();
  switch (queryStatus) {
    case 'pending':
      return (
        <StudioSkeleton
          aria-label={t('admin.apps.status.loading')}
          className={classes.cellSkeleton}
        />
      );
    case 'error':
      return '-';
    case 'success':
      return render();
  }
};

type ErrorMetricsCellProps = {
  isPending: boolean;
  isError: boolean;
  metrics: ErrorMetric[] | undefined;
};

/**
 * The app's errors in the selected period. An app without errors says so, so that it cannot be
 * mistaken for one whose errors could not be read, which shows a dash.
 */
const ErrorMetricsCell = ({ isPending, isError, metrics }: ErrorMetricsCellProps) => {
  const { t } = useTranslation();

  if (isPending) {
    return null;
  }
  if (isError) {
    return <div className={classes.errorMetricsCellContainer}>-</div>;
  }
  if (!metrics?.length) {
    return (
      <div className={classes.errorMetricsCellContainer}>
        <span className={classes.noErrors}>{t('admin.apps.no_errors')}</span>
      </div>
    );
  }
  return (
    <div className={classes.errorMetricsCellContainer}>
      {metrics.map((metric) => (
        <Alert
          key={metric.name}
          color='danger'
          title={
            <>
              <span className={classes.count}>{metric.count.toString()}</span>
              {t(`admin.metrics.${metric.name}`)}
            </>
          }
          url={metric.logsUrl}
          className={classes.errorMetric}
        ></Alert>
      ))}
    </div>
  );
};
