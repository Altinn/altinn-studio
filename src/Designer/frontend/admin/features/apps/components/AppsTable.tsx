import { useRunningAppsQuery } from 'admin/hooks/queries/useRunningAppsQuery';
import { useEnvironmentTitle } from 'admin/hooks/useEnvironmentTitle';
import classes from './AppsTable.module.css';
import type { PublishedApplication } from 'admin/types/PublishedApplication';
import {
  StudioSpinner,
  StudioTable,
  StudioSearch,
  StudioError,
  StudioTabs,
  StudioAlert,
} from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import { useErrorMetricsQuery } from 'admin/hooks/queries/useErrorMetricsQuery';
import { TimeRangeSelect } from 'admin/components/TimeRangeSelect/TimeRangeSelect';
import { Alert } from 'admin/components/Alert/Alert';
import { isAxiosError } from 'axios';
import { useCurrentOrg } from 'admin/layout/PageLayout';
import { createSearchParams, DEFAULT_SEARCH_PARAMS } from 'admin/utils/constants';

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
  const { t, i18n } = useTranslation();
  const orgName = useCurrentOrg().name[i18n.language];
  const [search, setSearch] = useQueryParamState<string>('appSearch', '');
  const [selectedEnvironment, setSelectedEnvironment] = useQueryParamState<string>(
    'environment',
    DEFAULT_SEARCH_PARAMS.environment,
  );

  const availableEnvironments = Object.keys(runningApps).toSorted(sortEnvironments);

  if (!availableEnvironments.length) {
    return (
      <StudioAlert data-color='info'>{t('admin.environment.no_results', { orgName })}</StudioAlert>
    );
  }

  if (!selectedEnvironment || !availableEnvironments.includes(selectedEnvironment)) {
    setSelectedEnvironment(availableEnvironments[0]);
    return <StudioSpinner aria-label={t('general.loading')} />;
  }

  return (
    <StudioTabs value={selectedEnvironment} onChange={setSelectedEnvironment}>
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
  const { t, i18n } = useTranslation();
  const envTitle = useEnvironmentTitle(environment);
  const orgName = useCurrentOrg().name[i18n.language];
  const [range, setRange] = useQueryParamState<number>('range', DEFAULT_SEARCH_PARAMS.range);
  const {
    data: errorMetrics,
    isPending: errorMetricsIsPending,
    error: errorMetricsError,
    isError: errorMetricsIsError,
  } = useErrorMetricsQuery(org, environment, range!, {
    hideDefaultError: true,
  });

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
            <StudioTable.Cell>{t('admin.apps.version')}</StudioTable.Cell>
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
              return {
                ...app,
                metrics: appErrorMetrics,
                hasMetrics: (appErrorMetrics?.length ?? 0) > 0,
              };
            })
            .sort(
              (a, b) => Number(b.hasMetrics) - Number(a.hasMetrics) || a.app.localeCompare(b.app),
            )
            .map((app) => (
              <StudioTable.Row key={app.app}>
                <StudioTable.Cell>
                  <Link to={`${environment}/${app.app}${createSearchParams({ range })}`}>
                    {app.app}
                  </Link>
                </StudioTable.Cell>
                <StudioTable.Cell>{app.version}</StudioTable.Cell>
                <StudioTable.Cell className={classes.errorMetricsCell}>
                  <div className={classes.errorMetricsCellContainer}>
                    {app.metrics?.map((metric) => {
                      return (
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
                      );
                    })}
                  </div>
                </StudioTable.Cell>
              </StudioTable.Row>
            ))}
        </StudioTable.Body>
      </StudioTable>
    </>
  );
};
