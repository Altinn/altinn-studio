import { useRunningAppsQuery } from 'admin/hooks/queries/useRunningAppsQuery';
import classes from './AppsTable.module.css';
import type { PublishedApplication } from 'admin/types/RunningApplication';
import { StudioSpinner, StudioTable, StudioSearch } from '@studio/components';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError, StudioTabs } from '@studio/components-legacy';
import { Link } from 'react-router-dom';
import type { TFunction } from 'i18next';

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
  runningApps: Record<string, PublishedApplication[]>;
};

function getEnvironmentName(env: string, t: TFunction) {
  if (env === 'production') {
    return t('Produksjon');
  }
  return env.toUpperCase();
}

const AppsTableWithData = ({ runningApps }: AppsTableWithDataProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

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
        <StudioTabs.Content key={env} value={env}>
          <StudioSearch
            className={classes.appSearch}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
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
