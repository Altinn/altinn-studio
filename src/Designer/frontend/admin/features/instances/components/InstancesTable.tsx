import { StudioButton, StudioSpinner, StudioTable, StudioError } from '@studio/components';
import classes from './InstancesTable.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppInstancesQuery } from 'admin/hooks/queries/useAppInstancesQuery';
import type { SimpleInstance } from 'admin/types/InstancesResponse';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
import { useMutation } from '@tanstack/react-query';
import { InstanceStatus } from './InstanceStatus';

type InstancesTableProps = {
  org: string;
  env: string;
  app: string;
  currentTask?: string;
  processIsComplete?: boolean;
  archiveReference?: string;
  confirmed?: boolean;
};

export const InstancesTable = ({
  org,
  env,
  app,
  currentTask,
  processIsComplete,
  archiveReference,
  confirmed,
}: InstancesTableProps) => {
  const { data, status, fetchNextPage, hasNextPage } = useAppInstancesQuery(
    org,
    env,
    app,
    currentTask,
    processIsComplete,
    archiveReference,
    confirmed,
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
              {/* <Link to={`${instance.id}`}>{instance.id}</Link> */}
              {instance.id}
            </StudioTable.Cell>
            <StudioTable.Cell>{formatDateAndTime(instance.createdAt)}</StudioTable.Cell>
            <StudioTable.Cell>
              {instance.currentTaskName ?? instance.currentTaskId ?? '-'}
            </StudioTable.Cell>
            <StudioTable.Cell>
              <InstanceStatus instance={instance} />
            </StudioTable.Cell>
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
