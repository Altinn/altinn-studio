import { StudioButton, StudioSpinner, StudioTable } from 'libs/studio-components/src';
import classes from './InstancesTable.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioError } from 'libs/studio-components-legacy/src';
import { Link } from 'react-router-dom';
import { useAppInstancesQuery } from '../../../hooks/queries/useAppInstancesQuery';
import type { SimpleInstance } from '../../../types/InstancesResponse';
import { formatDateAndTime } from '../../../utils/formatDateAndTime';
import { useMutation } from '@tanstack/react-query';

type InstancesTableProps = {
  org: string;
  env: string;
  app: string;
  currentTask?: string;
  processIsComplete?: boolean;
};

export const InstancesTable = ({
  org,
  env,
  app,
  currentTask,
  processIsComplete,
}: InstancesTableProps) => {
  const { data, status, fetchNextPage, hasNextPage } = useAppInstancesQuery(
    org,
    env,
    app,
    currentTask,
    processIsComplete,
  );
  const { t } = useTranslation();

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return (
        <InstancesTableWithData
          instances={data}
          hasMoreResults={hasNextPage}
          fetchMoreResults={fetchNextPage}
        />
      );
  }
};

type InstancesTableWithDataProps = {
  instances: SimpleInstance[];
  hasMoreResults: boolean;
  fetchMoreResults: () => Promise<unknown>;
};

const InstancesTableWithData = ({
  instances,
  hasMoreResults,
  fetchMoreResults,
}: InstancesTableWithDataProps) => {
  const { t } = useTranslation();
  const { isPending: isFetchingMoreResults, mutate: doFetchMoreResults } = useMutation({
    mutationFn: fetchMoreResults,
  });

  return (
    <StudioTable zebra>
      <StudioTable.Head>
        <StudioTable.Row>
          <StudioTable.Cell>{t('Id')}</StudioTable.Cell>
          <StudioTable.Cell>{t('Opprettet')}</StudioTable.Cell>
          <StudioTable.Cell>{t('Prosessteg')}</StudioTable.Cell>
          <StudioTable.Cell>{t('Status')}</StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        {instances.map((instance) => (
          <StudioTable.Row key={instance.id}>
            <StudioTable.Cell>
              <Link to={`${instance.id}`}>{instance.id}</Link>
            </StudioTable.Cell>
            <StudioTable.Cell>{formatDateAndTime(instance.createdAt)}</StudioTable.Cell>
            <StudioTable.Cell>
              {instance.currentTaskName ?? instance.currentTaskId ?? 'Avsluttet'}
            </StudioTable.Cell>
            <StudioTable.Cell>{getStatus(instance)}</StudioTable.Cell>
          </StudioTable.Row>
        ))}
      </StudioTable.Body>
      {hasMoreResults && (
        <StudioTable.Foot>
          <StudioTable.Row>
            <StudioTable.Cell className={classes.footerCell} colSpan={4}>
              <StudioButton disabled={isFetchingMoreResults} onClick={() => doFetchMoreResults()}>
                {isFetchingMoreResults && <StudioSpinner aria-label={t('general.loading')} />}
                {t('Last inn 10 flere rader')}
              </StudioButton>
            </StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Foot>
      )}
    </StudioTable>
  );
};

// TODO: These may not be reducable to a single status?
function getStatus(instance: SimpleInstance) {
  switch (true) {
    case instance.isSoftDeleted:
    case instance.isHardDeleted:
      return 'Slettet';
    case instance.isConfirmed:
      return 'Bekreftet';
    case instance.isArchived:
      return 'Arkivert';
    case instance.isComplete:
      return 'Levert';
    default:
      return 'Aktiv';
  }
}
