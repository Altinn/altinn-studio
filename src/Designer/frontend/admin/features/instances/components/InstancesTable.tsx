import {
  StudioButton,
  StudioSpinner,
  StudioTable,
  StudioError,
  StudioAlert,
} from '@studio/components';
import { useEnvironmentTitle } from 'admin/hooks/useEnvironmentTitle';
import classes from './InstancesTable.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppInstancesQuery } from 'admin/hooks/queries/useAppInstancesQuery';
import type { SimpleInstance } from 'admin/types/InstancesResponse';
import { formatDateAndTime } from 'admin/utils/formatDateAndTime';
import { useMutation } from '@tanstack/react-query';
import { InstanceStatus } from './InstanceStatus';
import { isAxiosError } from 'axios';
import { Skeleton } from '@digdir/designsystemet-react';
import { useCurrentOrg } from 'admin/layout/PageLayout';
import { Link } from 'react-router-dom';

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
  createdBefore?: string;
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
  createdBefore,
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
    createdBefore,
  );
  const { t, i18n } = useTranslation();
  const orgName = useCurrentOrg().name[i18n.language];
  const envTitle = useEnvironmentTitle(env);

  switch (status) {
    case 'pending':
      return <InstancesTableSkeleton n={11} />;
    case 'error':
      if (isAxiosError(error) && error.response?.status === 403) {
        return (
          <StudioAlert data-color='info'>
            {t('admin.instances.missing_rights', { envTitle, orgName })}
          </StudioAlert>
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

const InstancesTableSkeleton = ({ n }: { n: number }) => {
  const { t } = useTranslation();
  return (
    <div aria-label={t('general.loading')} className={classes.skeletonWrapper}>
      {Array.from({ length: n }).map((_, i) => (
        <Skeleton.Rectangle key={i} className={classes.rowSkeleton} />
      ))}
      <Skeleton.Rectangle className={classes.buttonSkeleton} />
    </div>
  );
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

  if (!instances.length) {
    return <StudioAlert data-color='info'>{t('admin.instances.no_results')}</StudioAlert>;
  }

  return (
    <StudioTable>
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
              <Link to={`instances/${instance.id}`}>{instance.id}</Link>
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
