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
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import { useMetricsQuery } from 'admin/hooks/queries/useMetricsQuery';
import { TimeRangeSelect } from 'admin/shared/TimeRangeSelect';

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
    data: metrics,
    isPending: metricsIsPending,
    isError: metricsIsError,
  } = useMetricsQuery(org, env, range!, {
    hideDefaultError: true,
  });

  return (
    <>
      {metricsIsError && (
        <StudioAlert data-color={'danger'} className={classes.metricsError}>
          <Trans i18nKey={'admin.alerts.error'} values={{ env }} />
        </StudioAlert>
      )}
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
              <TimeRangeSelect
                label={t('admin.apps.alerts')}
                value={range!}
                onChange={(e) => setRange(e)}
              />
            </StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {runningApps[env]
            .filter((app) => !search || app.app.toLowerCase().includes(search.toLowerCase()))
            .map((app) => {
              const appMetrics = metrics?.filter((metric) => metric.appName === app.app);
              return {
                ...app,
                metrics: appMetrics,
                hasMetrics: appMetrics?.length ?? 0 > 0,
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
                          <span className={classes.metricText}>
                            {t(`admin.alerts.${metric.name}`, { count: metric.count })}
                          </span>
                          <StudioLink
                            href={'metric.url'}
                            rel='noopener noreferrer'
                            target='_blank'
                            className={classes.metricLink}
                          >
                            {t('admin.alerts.link')}
                          </StudioLink>
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
