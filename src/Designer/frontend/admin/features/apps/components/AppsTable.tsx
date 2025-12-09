import { useRunningAppsQuery } from 'admin/hooks/queries/useRunningAppsQuery';
import classes from './AppsTable.module.css';
import type { PublishedApplication } from 'admin/types/PublishedApplication';
import {
  StudioSpinner,
  StudioTable,
  StudioSearch,
  StudioError,
  StudioTabs,
} from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQueryParamState } from 'admin/hooks/useQueryParamState';

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

const environmentOrder = ['production', 'tt02', 'at22', 'at23', 'at24', 'yt01'];

const sortEnvironments = (a: string, b: string) => {
  const indexA = environmentOrder.indexOf(a);
  const indexB = environmentOrder.indexOf(b);
  return indexA - indexB;
};

const AppsTableWithData = ({ runningApps }: AppsTableWithDataProps) => {
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
              </StudioTable.Row>
            </StudioTable.Head>
            <StudioTable.Body>
              {runningApps[env]
                .filter((app) => !search || app.app.toLowerCase().includes(search.toLowerCase()))
                .map((app) => (
                  <StudioTable.Row key={app.app}>
                    <StudioTable.Cell>
                      <Link to={`${env}/${app.app}`}>{app.app}</Link>
                    </StudioTable.Cell>
                    <StudioTable.Cell>{app.version}</StudioTable.Cell>
                  </StudioTable.Row>
                ))}
            </StudioTable.Body>
          </StudioTable>
        </StudioTabs.Panel>
      ))}
    </StudioTabs>
  );
};
