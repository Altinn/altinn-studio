import { StudioButton, StudioSpinner, StudioTable, StudioError } from '@studio/components';
import classes from './InstancesTable.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppInstancesQuery } from 'admin/hooks/queries/useAppInstancesQuery';
import type { SimpleInstance } from 'admin/types/InstancesResponse';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
import { useMutation } from '@tanstack/react-query';
import { InstanceStatus } from './InstanceStatus';
import { isAxiosError } from 'axios';
import { Alert } from '@digdir/designsystemet-react';
import { useCurrentOrg } from 'admin/layout/PageLayout';

type InstancesTableProps = {
  org: string;
  env: string;
  app: string;
  currentTask?: string;
  isArchived?: boolean;
  archiveReference?: string;
  confirmed?: boolean;
  isSoftDeleted?: boolean;
  isHardDeleted?: boolean;
};

export const InstancesTable = ({
  org,
  env,
  app,
  currentTask,
  isArchived,
  archiveReference,
  confirmed,
  isSoftDeleted,
  isHardDeleted,
}: InstancesTableProps) => {
  const { data, status, error, fetchNextPage, hasNextPage } = useAppInstancesQuery(
    org,
    env,
    app,
    currentTask,
    isArchived,
    archiveReference,
    confirmed,
    isSoftDeleted,
    isHardDeleted,
  );
  const { t, i18n } = useTranslation();
  const orgName = useCurrentOrg().name[i18n.language];

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      if (isAxiosError(error) && error.response?.status === 403) {
        const envTitle =
          env === 'prod'
            ? t(`general.production_environment_alt`).toLowerCase()
            : `${t('general.test_environment_alt').toLowerCase()} ${env?.toUpperCase()}`;
        return (
          <Alert severity='info'>
            {t('admin.instances.missing_rights', { envTitle, orgName })}
          </Alert>
        );
      }
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
          <StudioTable.Cell>{t('admin.instances.id')}</StudioTable.Cell>
          <StudioTable.Cell>{t('admin.instances.created')}</StudioTable.Cell>
          <StudioTable.Cell>{t('admin.instances.process_task')}</StudioTable.Cell>
          <StudioTable.Cell>{t('admin.instances.status')}</StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        {instances.map((instance) => (
          <StudioTable.Row key={instance.id}>
            <StudioTable.Cell>
              {/* <Link to={`${instance.id}`}>{instance.id}</Link> */}
              {instance.id}
            </StudioTable.Cell>
            <StudioTable.Cell>
              {instance.createdAt ? formatDateAndTime(instance.createdAt) : '-'}
            </StudioTable.Cell>
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
                {t('admin.instances.fetch_more')}
              </StudioButton>
            </StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Foot>
      )}
    </StudioTable>
  );
};
