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
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';
import { useAlertsQuery } from 'admin/hooks/queries/useAlertsQuery';

type AppsTableProps = {
  org: string;
};

export const AppsTable = ({ org }: AppsTableProps) => {
  const { data: runningApps, status: runningAppsStatus } = useRunningAppsQuery(org);
  const { t } = useTranslation();

  switch (runningAppsStatus) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return <AppsTableWithData org={org} runningApps={runningApps} />;
  }
};

type AppsTableWithDataProps = {
  runningApps: Record<string, PublishedApplication[]>;
  org: string;
};

function getEnvironmentName(env: string, t: TFunction) {
  if (env === 'production') {
    return t('Produksjon');
  }
  return env.toUpperCase();
}

const AppsTableWithData = ({ org, runningApps }: AppsTableWithDataProps) => {
  const { t } = useTranslation();

  const availableEnvironments = Object.keys(runningApps);

  return (
    <StudioTabs defaultValue={availableEnvironments.at(0)}>
      <StudioTabs.List>
        {availableEnvironments.map((env) => (
          <StudioTabs.Tab key={env} value={env}>
            {getEnvironmentName(env, t)}
          </StudioTabs.Tab>
        ))}
      </StudioTabs.List>
      {availableEnvironments.map((env) => (
        <AppsTableWithDataByEnv key={env} org={org} env={env} runningApps={runningApps} />
      ))}
    </StudioTabs>
  );
};

type AppsTableWithDataByEnvProps = AppsTableWithDataProps & {
  env: string;
};

const AppsTableWithDataByEnv = ({ org, runningApps, env }: AppsTableWithDataByEnvProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const { data: alerts } = useAlertsQuery(org, env);
  return (
    <StudioTabs.Panel key={env} value={env}>
      <StudioSearch
        className={classes.appSearch}
        value={search}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        label={t('Søk i apper')}
      />
      <StudioTable className={classes.appsTable}>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.Cell>{t('Navn')}</StudioTable.Cell>
            <StudioTable.Cell>{t('Versjon')}</StudioTable.Cell>
            <StudioTable.Cell className={classes.alertsHeaderCell}>{t('Varsler')}</StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {runningApps[env]
            .filter((app) => !search || app.app.toLowerCase().includes(search.toLowerCase()))
            .map((app) => {
              const appAlerts = alerts?.filter((alert) => alert.app === app.app);
              return {
                ...app,
                alerts: appAlerts,
                hasAlerts: appAlerts?.length > 0,
              };
            })
            .sort((a, b) => Number(b.hasAlerts) - Number(a.hasAlerts) || a.app.localeCompare(b.app))
            .map((app) => {
              return (
                <StudioTable.Row key={app.app}>
                  <StudioTable.Cell>
                    <Link to={`${env}/${app.app}`}>{app.app}</Link>
                  </StudioTable.Cell>
                  <StudioTable.Cell>{app.version}</StudioTable.Cell>
                  <StudioTable.Cell>
                    <div className={classes.alertCell}>
                      {app.alerts?.map((alert) => {
                        return (
                          <StudioAlert
                            key={alert.type}
                            data-color='danger'
                            data-size='xs'
                            className={classes.alert}
                          >
                            <span className={classes.alertText}>
                              {t('admin.alerts.' + alert.type)}
                            </span>
                            <StudioLink
                              href={alert.url}
                              rel='noopener noreferrer'
                              target='_blank'
                              className={classes.alertLink}
                            >
                              {t('admin.alerts.link')}
                            </StudioLink>
                          </StudioAlert>
                        );
                      })}
                    </div>
                  </StudioTable.Cell>
                </StudioTable.Row>
              );
            })}
        </StudioTable.Body>
      </StudioTable>
    </StudioTabs.Panel>
  );
};
