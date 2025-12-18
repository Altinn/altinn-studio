import { useRunningAppsQuery } from 'admin/hooks/queries/useRunningAppsQuery';
import classes from './AppsTable.module.css';
import type { PublishedApplication } from 'admin/types/PublishedApplication';
import {
  StudioSpinner,
  StudioTable,
  StudioSearch,
  StudioError,
  StudioTabs,
  StudioAlert,
  StudioLink,
} from '@studio/components';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import { useErrorMetricsQuery } from 'admin/hooks/queries/useErrorMetricsQuery';
import { TimeRangeSelect } from 'admin/shared/TimeRangeSelect';
import { toast } from 'react-toastify';
import { appErrorMetricsLogsPath } from 'admin/utils/apiPaths';

type AppsTableProps = {
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
  const [search, setSearch] = useQueryParamState<string>('appSearch', '');
  const [tab, setTab] = useQueryParamState<string>('environment', undefined);

  const availableEnvironments = Object.keys(runningApps).toSorted(sortEnvironments);

  return (
    <StudioTabs value={tab ?? availableEnvironments.at(0)} onChange={setTab}>
      <StudioTabs.List>
        {availableEnvironments.map((env) => (
          <StudioTabs.Tab key={env} value={env}>
            {t(`admin.environment.${env}`)} ({runningApps[env].length})
          </StudioTabs.Tab>
        ))}
      </StudioTabs.List>
      {availableEnvironments.map((env) => (
        <StudioTabs.Panel key={env} value={env}>
          <AppsTableContent
            key={env}
            org={org}
            env={env}
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
  env: string;
  search?: string;
  setSearch: (newState: string) => void;
};

const AppsTableContent = ({ org, env, search, setSearch, runningApps }: AppsTableContentProps) => {
  const { t } = useTranslation();
  const defaultRange = 1440;
  const [range, setRange] = useQueryParamState<number>('range', defaultRange);
  const {
    data: errorMetrics,
    isPending: errorMetricsIsPending,
    isError: errorMetricsIsError,
  } = useErrorMetricsQuery(org, env, range!, {
    hideDefaultError: true,
  });

  useEffect(() => {
    if (errorMetricsIsError) {
      toast.error(t('admin.alerts.error'));
    }
  }, [errorMetricsIsError, t]);

  const renderAlertsHeader = () => {
    return (
      <>
        {errorMetricsIsPending && (
          <StudioSpinner aria-label={t('admin.alerts.pending')} delayMs={1000} />
        )}
        <TimeRangeSelect
          label={t('admin.apps.alerts')}
          value={range!}
          onChange={(e) => setRange(e)}
        />
      </>
    );
  };

  return (
    <>
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
            <StudioTable.Cell className={classes.metricsHeaderCell}>
              {renderAlertsHeader()}
            </StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {runningApps[env]
            .filter((app) => !search || app.app.toLowerCase().includes(search.toLowerCase()))
            .map((app) => {
              const appErrorMetrics = errorMetrics?.filter((metric) => metric.appName === app.app);
              return {
                ...app,
                metrics: appErrorMetrics,
                hasMetrics: appErrorMetrics?.length ?? 0 > 0,
              };
            })
            .sort(
              (a, b) => Number(b.hasMetrics) - Number(a.hasMetrics) || a.app.localeCompare(b.app),
            )
            .map((app) => (
              <StudioTable.Row key={app.app}>
                <StudioTable.Cell>
                  <Link
                    to={`${env}/${app.app}${range && range !== defaultRange ? '?range=' + range : ''}`}
                  >
                    {app.app}
                  </Link>
                </StudioTable.Cell>
                <StudioTable.Cell>{app.version}</StudioTable.Cell>
                <StudioTable.Cell className={classes.metricsCell}>
                  <div className={classes.metricsCellContainer}>
                    {app.metrics?.map((metric) => {
                      return (
                        <StudioAlert
                          key={metric.name}
                          data-color='danger'
                          data-size='xs'
                          className={classes.metric}
                        >
                          <div className={classes.metricTitle}>
                            <span className={classes.metricText}>
                              <span className={classes.metricCount}>{metric.count}</span>
                              {t(`admin.metrics.${metric.name}`)}
                            </span>
                            <StudioLink
                              href={appErrorMetricsLogsPath(org, env, app.app, metric.name, range!)}
                              rel='noopener noreferrer'
                              target='_blank'
                              className={classes.metricLink}
                            >
                              {t('admin.alerts.link')}
                            </StudioLink>
                          </div>
                        </StudioAlert>
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
