import { useRunningAppsQuery } from '../../../hooks/queries/useRunningAppsQuery';
import type { RunningApplication } from '../../../types/RunningApplication';
import { StudioSpinner, StudioTable } from 'libs/studio-components/src';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError, StudioSearch, StudioTabs } from 'libs/studio-components-legacy/src';
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
  runningApps: RunningApplication[];
};

// TODO: Fetch actual environments from CDN
const sortedEnvironmentNames = ['production', 'tt02', 'yt01', 'at21', 'at22', 'at23', 'at24'];

const AppsTableWithData = ({ runningApps }: AppsTableWithDataProps) => {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');

  const availableEnvironments = sortedEnvironmentNames.filter((env) =>
    runningApps.some((app) => app.environments.includes(env)),
  );

  const runningAppsFiltered = runningApps.filter(
    (app) => !search || app.app.toLowerCase().includes(search.toLowerCase()),
  );

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
                <StudioTable.Cell>{t('Navn')}</StudioTable.Cell>
              </StudioTable.Row>
            </StudioTable.Head>
            <StudioTable.Body>
              {runningAppsFiltered
                .filter((app) => app.environments.includes(env))
                .map((app) => (
                  <StudioTable.Row key={app.app}>
                    <StudioTable.Cell>
                      <Link to={`${env}/${app.app}/instances`}>{app.app}</Link>
                    </StudioTable.Cell>
                  </StudioTable.Row>
                ))}
            </StudioTable.Body>
          </StudioTable>
        </StudioTabs.Content>
      ))}
    </StudioTabs>
  );
};
