import { useRunningAppsQuery } from 'admin/hooks/queries/useRunningAppsQuery';
import type { RunningApplication } from 'admin/types/RunningApplication';
import { StudioLink, StudioSelect, StudioSpinner, StudioTable } from '@studio/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError, StudioSearch, StudioTabs } from '@studio/components-legacy';
import { Link } from 'react-router-dom';
import classes from './AppsTable.module.css';
import { grafanaExceptionsUrl } from 'app-shared/ext-urls';
import { ExternalLinkIcon } from '@studio/icons';
import { useAppExceptionsQuery } from 'admin/hooks/queries/useAppExceptionsQuery';
import { useAppFailedRequestsQuery } from 'admin/hooks/queries/useAppFailedRequestsQuery';
import type { AppFailedRequestDataPoint } from 'admin/types/AppFailedRequestDataPoint';
import type { AppExceptionDataPoint } from 'admin/types/AppExceptionDataPoint';
import 'chartjs-adapter-date-fns';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
} from 'chart.js';

import { Line } from 'react-chartjs-2';

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
  org: string;
  runningApps: RunningApplication[];
};

// TODO: Fetch actual environments from CDN
const sortedEnvironmentNames = ['production', 'tt02', 'yt01', 'at21', 'at22', 'at23', 'at24'];

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
);

const getChartOptions = (time: number) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        display: false,
        font: {
          color: '#ddd',
          size: 10,
        },
        maxTicksLimit: 5,
      },
      type: 'time',
      time: {
        unit: time <= 24 ? 'hour' : 'day', // TODO: remove Number conversion when time is a number
      },
    },
    y: {
      border: {
        display: false,
      },
      grid: {
        display: false,
      },
      ticks: {
        display: false,
        font: {
          color: '#ddd',
          size: 10,
        },
      },
    },
  },
});
const getExceptions = (dataPoints: AppExceptionDataPoint[]) => ({
  labels: dataPoints?.map((dataPoint) => dataPoint.dateTimeOffset),
  datasets: [
    {
      fill: true,
      data: dataPoints?.map((dataPoint) => dataPoint.count),
      borderColor: '#ce4d4d',
      backgroundColor: '#fbe3e6',
      // tension: 0.4,
      borderWidth: 2,
      pointRadius: 1,
    },
  ],
});
const getFailedRequests = (dataPoints: AppFailedRequestDataPoint[]) => ({
  labels: dataPoints?.map((dataPoint) => dataPoint.dateTimeOffset),
  datasets: [
    {
      fill: true,
      data: dataPoints?.map((dataPoint) => dataPoint.count),
      borderColor: '#ce4d4d',
      backgroundColor: '#fbe3e6',
      // tension: 0.4,
      borderWidth: 2,
      pointRadius: 1,
    },
  ],
});

const AppsTableWithData = ({ org, runningApps }: AppsTableWithDataProps) => {
  const { t } = useTranslation();
  const [time, setTime] = useState(24);

  const [search, setSearch] = useState('');

  const availableEnvironments = sortedEnvironmentNames.filter((env) =>
    runningApps.some((app) => app.environments.includes(env)),
  );

  const runningAppsFiltered = runningApps.filter(
    (app) => !search || app.app.toLowerCase().includes(search.toLowerCase()),
  );

  const handleTime = (value: number) => {
    setTime(value);
  };
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState(undefined);
  const handleSort = (field) => {};

  return (
    <StudioTabs defaultValue={availableEnvironments[0]}>
      <StudioTabs.List>
        {availableEnvironments.map((env) => (
          <StudioTabs.Tab key={env} value={env}>
            {env}
          </StudioTabs.Tab>
        ))}
      </StudioTabs.List>
      {availableEnvironments.map((env) => (
        <StudioTabs.Content key={env} value={env}>
          <StudioSearch
            value={search}
            autoComplete='off'
            onChange={(e) => setSearch(e.target.value)}
            label={t('Søk på appnavn')}
          />
          <StudioTable>
            <StudioTable.Head>
              <StudioTable.Row>
                <StudioTable.HeaderCell>{t('Navn')}</StudioTable.HeaderCell>
                <StudioTable.HeaderCell
                  onClick={() => handleSort('count')}
                  className={classes.errorHeaderCell}
                >
                  <div className={classes.errorHeaderCellContent}>
                    <div>{t('Feil')}</div>
                    <div className={classes.errorHeaderCellLast}>
                      {t('Siste')}
                      <StudioSelect
                        label={null}
                        // description={'Time'}
                        value={time}
                        onChange={(e) => handleTime(Number(e.target.value))}
                        className={classes.select}
                      >
                        <StudioSelect.Option value='1'>1t</StudioSelect.Option>
                        <StudioSelect.Option value='6'>6t</StudioSelect.Option>
                        <StudioSelect.Option value='12'>12t</StudioSelect.Option>
                        <StudioSelect.Option value='24'>1d</StudioSelect.Option>
                        <StudioSelect.Option value='72'>3d</StudioSelect.Option>
                        <StudioSelect.Option value='168'>7d</StudioSelect.Option>
                        <StudioSelect.Option value='720'>30d</StudioSelect.Option>
                      </StudioSelect>
                    </div>
                  </div>
                </StudioTable.HeaderCell>
                <StudioTable.HeaderCell
                  onClick={() => handleSort('count')}
                  className={classes.errorHeaderCell}
                >
                  <div className={classes.errorHeaderCellContent}>
                    <div>{t('Mislykkede forespørsler')}</div>
                    <div className={classes.errorHeaderCellLast}>
                      {t('Siste')}
                      <StudioSelect
                        label={null}
                        // description={'Time'}
                        value={time}
                        onChange={(e) => handleTime(Number(e.target.value))}
                        className={classes.select}
                      >
                        <StudioSelect.Option value='1'>1t</StudioSelect.Option>
                        <StudioSelect.Option value='6'>6t</StudioSelect.Option>
                        <StudioSelect.Option value='12'>12t</StudioSelect.Option>
                        <StudioSelect.Option value='24'>1d</StudioSelect.Option>
                        <StudioSelect.Option value='72'>3d</StudioSelect.Option>
                        <StudioSelect.Option value='168'>7d</StudioSelect.Option>
                        <StudioSelect.Option value='720'>30d</StudioSelect.Option>
                      </StudioSelect>
                    </div>
                  </div>
                </StudioTable.HeaderCell>
              </StudioTable.Row>
            </StudioTable.Head>
            <StudioTable.Body>
              <AppsTableBody org={org} env={env} runningApps={runningAppsFiltered} time={time} />
            </StudioTable.Body>
          </StudioTable>
        </StudioTabs.Content>
      ))}
    </StudioTabs>
  );
};

type AppsTableBodyProps = {
  org: string;
  env: string;
  runningApps: RunningApplication[];
  time: number;
};

const AppsTableBody = ({ org, env, runningApps, time }: AppsTableBodyProps) => {
  const { t } = useTranslation();

  const { data: appExceptions } = useAppExceptionsQuery(org, 'tt02', '', time);
  const { data: appFailedRequests } = useAppFailedRequestsQuery(org, 'tt02', '', time);

  const options = getChartOptions(time);

  return runningApps
    .filter((app) => app.environments.includes(env))
    .map((app) => {
      const appException = appExceptions?.find((e) => e.appName === app.app);
      const exceptions = getExceptions(appException?.dataPoints);
      const exceptionsCount = appException
        ? appException?.dataPoints.reduce((sum, e) => sum + e.count, 0)
        : 0;

      const appFailedRequest = appFailedRequests?.find((e) => e.appName === app.app);
      const failedRequests = getFailedRequests(appFailedRequest?.dataPoints);
      const failedRequestsCount = appFailedRequest
        ? appFailedRequest?.dataPoints.reduce((sum, e) => sum + e.count, 0)
        : 0;

      return (
        <StudioTable.Row key={app.app}>
          <StudioTable.Cell>
            <Link to={`${env}/${app.app}/instances`}>{app.app}</Link>
          </StudioTable.Cell>
          <StudioTable.Cell className={classes.errorCell}>
            <div className={classes.errorCellContent}>
              {exceptionsCount !== undefined ? (
                <div>
                  <div
                    className={
                      exceptionsCount > 0 ? classes.errorDangerCount : classes.errorSuccessCount
                    }
                  >
                    {exceptionsCount ?? <StudioSpinner aria-label={t('general.loading')} />}
                  </div>
                </div>
              ) : (
                <StudioSpinner aria-label={t('general.loading')} />
              )}
              <div>
                <div className={classes.chart}>
                  <Line options={options} data={exceptions} />
                </div>
                <div className={classes.grafanaLink}>
                  <StudioLink
                    href={grafanaExceptionsUrl({
                      org,
                      env,
                      app: app.app,
                      isProduction: false,
                      //isProduction: org.type.toLowerCase() === PROD_ENV_TYPE,
                      from: time + 'h',
                    })}
                    rel='noopener noreferrer'
                    target='_blank'
                    icon={<ExternalLinkIcon title={t('general.open_app_in_new_window')} />}
                    iconPlacement={'right'}
                  >
                    Grafana
                  </StudioLink>
                </div>
              </div>
            </div>
          </StudioTable.Cell>
          <StudioTable.Cell className={classes.errorCell}>
            <div className={classes.errorCellContent}>
              {failedRequestsCount !== undefined ? (
                <div>
                  <div
                    className={
                      failedRequestsCount > 0 ? classes.errorDangerCount : classes.errorSuccessCount
                    }
                  >
                    {failedRequestsCount}
                  </div>
                </div>
              ) : (
                <StudioSpinner aria-label={t('general.loading')} />
              )}
              <div>
                <div className={classes.chart}>
                  <Line options={options} data={failedRequests} />
                </div>
                <div className={classes.grafanaLink}>
                  <StudioLink
                    href={grafanaExceptionsUrl({
                      org,
                      env,
                      app: app.app,
                      isProduction: false,
                      //isProduction: org.type.toLowerCase() === PROD_ENV_TYPE,
                      from: time + 'h',
                    })}
                    rel='noopener noreferrer'
                    target='_blank'
                    icon={<ExternalLinkIcon title={t('general.open_app_in_new_window')} />}
                    iconPlacement={'right'}
                  >
                    Grafana
                  </StudioLink>
                </div>
              </div>
            </div>
          </StudioTable.Cell>
        </StudioTable.Row>
      );
    });
};
