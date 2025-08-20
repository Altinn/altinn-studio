import { useRunningAppsQuery } from 'admin/hooks/queries/useRunningAppsQuery';
import classes from './AppsTable.module.css';
import type { RunningApplication } from 'admin/types/RunningApplication';
import { StudioSpinner, StudioTable } from '@studio/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError, StudioSearch, StudioTabs } from '@studio/components-legacy';
import { Link } from 'react-router-dom';

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
      return <AppsTableWithData runningApps={data} />;
  }
};

type AppsTableWithDataProps = {
  runningApps: Record<string, RunningApplication[]>;
};

function getEnvironmentName(env: string) {
  if (env === 'production') {
    return 'Produksjon';
  }
  return env.toUpperCase();
}

const AppsTableWithData = ({ runningApps }: AppsTableWithDataProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const availableEnvironments = Object.keys(runningApps);

  return (
    <StudioTabs defaultValue={availableEnvironments[0]}>
      <StudioTabs.List>
        {availableEnvironments.map((env) => (
          <StudioTabs.Tab key={env} value={env}>
            {getEnvironmentName(env)}
          </StudioTabs.Tab>
        ))}
      </StudioTabs.List>
      {availableEnvironments.map((env) => (
        <StudioTabs.Content key={env} value={env}>
          <StudioSearch
            className={classes.appSearch}
            value={search}
            autoComplete='off'
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            label={t('Søk i apper')}
          />
          <StudioTable>
            <StudioTable.Head>
              <StudioTable.Row>
                <StudioTable.Cell>{t('Navn')}</StudioTable.Cell>
                <StudioTable.Cell>{t('Versjon')}</StudioTable.Cell>
              </StudioTable.Row>
            </StudioTable.Head>
            <StudioTable.Body>
              {runningApps[env]
                .filter((app) => !search || app.app.toLowerCase().includes(search.toLowerCase()))
                .map((app) => (
                  <StudioTable.Row key={app.app}>
                    <StudioTable.Cell>
                      <Link to={`${env}/${app.app}/instances`}>{app.app}</Link>
                    </StudioTable.Cell>
                    <StudioTable.Cell>{app.version}</StudioTable.Cell>
                  </StudioTable.Row>
                ))}
            </StudioTable.Body>
          </StudioTable>
        </StudioTabs.Content>
      ))}
    </StudioTabs>
  );
};
