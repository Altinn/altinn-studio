import {
  StudioButton,
  StudioSpinner,
  StudioTable,
  StudioError,
  StudioAlert,
  StudioSkeleton,
} from '@studio/components';
import { useEnvironmentTitle } from 'admin/features/apps/hooks/useEnvironmentTitle';
import classes from './InstancesTable.module.css';
import { useTranslation } from 'react-i18next';
import { useAppInstancesQuery } from 'admin/features/apps/hooks/queries/useAppInstancesQuery';
import type { SimpleInstance } from 'admin/features/apps/types/InstancesResponse';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';
import { useMutation } from '@tanstack/react-query';
import { InstanceStatus } from './InstanceStatus';
import { isAxiosError } from 'axios';
import { useCurrentOrg } from 'admin/contexts/OrgContext';
import { Link } from 'react-router-dom';
import { useInstancesWorkflowHealthQuery } from 'admin/features/apps/hooks/queries/useInstancesWorkflowHealthQuery';
import type { WorkflowHealthLookup } from 'admin/features/apps/utils/workflowHealth';
import { extractInstanceGuid, WorkflowHealth } from 'admin/features/apps/utils/workflowHealth';
import { WorkflowHealthCell, WorkflowHealthHeaderCell } from './WorkflowHealthColumn';

type InstancesTableProps = {
  org: string;
  environment: string;
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
  environment,
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
    environment,
    app,
    currentTask,
    isArchived,
    archiveReference,
    confirmed,
    isSoftDeleted,
    isHardDeleted,
    createdBefore,
  );
  const { t } = useTranslation();
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const envTitle = useEnvironmentTitle(environment);

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
      if (isAxiosError(error) && error.response?.status === 404) {
        return (
          <StudioAlert data-color='info'>
            {t('admin.instances.unavailable', { envTitle, orgName })}
          </StudioAlert>
        );
      }
      return <StudioError>{t('general.page_error_title')}</StudioError>;
    case 'success':
      return (
        <InstancesTableWithData
          org={org}
          environment={environment}
          app={app}
          instancePages={data}
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
        <StudioSkeleton key={i} className={classes.rowSkeleton} />
      ))}
      <StudioSkeleton className={classes.buttonSkeleton} />
    </div>
  );
};

type InstancesTableWithDataProps = {
  org: string;
  environment: string;
  app: string;
  /** The loaded instance pages, kept apart so health is requested one page at a time. */
  instancePages: SimpleInstance[][];
  hasMoreResults: boolean;
  fetchMoreResults: () => Promise<unknown>;
};

const COLUMN_COUNT = 5;

/**
 * What one row's health cell should show.
 *
 * An unusable instance id has no key to join on, and anything else is whatever the annotate request
 * that row's own key was asked for in reported — including its own failure, so a request that fell
 * over greys out its own rows only and leaves the answered rows their verdict.
 */
function resolveRowHealth(
  collectionKey: string | undefined,
  { healthByKey, pendingKeys }: WorkflowHealthLookup,
): { health: WorkflowHealth | undefined; isPending: boolean } {
  if (collectionKey === undefined) {
    return { health: WorkflowHealth.NoData, isPending: false };
  }
  return { health: healthByKey[collectionKey], isPending: pendingKeys.has(collectionKey) };
}

const InstancesTableWithData = ({
  org,
  environment,
  app,
  instancePages,
  hasMoreResults,
  fetchMoreResults,
}: InstancesTableWithDataProps) => {
  const { t } = useTranslation();
  const { isPending: isFetchingMoreResults, mutate: doFetchMoreResults } = useMutation({
    mutationFn: fetchMoreResults,
  });

  // The engine's collection key is the bare instance GUID, which is exactly what Storage's Studio
  // instance list already reports as the instance id.
  const rowPages = instancePages.map((page) =>
    page.map((instance) => ({ instance, collectionKey: extractInstanceGuid(instance.id) })),
  );
  const rows = rowPages.flat();
  const health = useInstancesWorkflowHealthQuery(
    org,
    environment,
    app,
    rowPages.map((page) =>
      page.map((row) => row.collectionKey).filter((key): key is string => key !== undefined),
    ),
  );

  if (!rows.length) {
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
          <StudioTable.Cell>
            <WorkflowHealthHeaderCell />
          </StudioTable.Cell>
        </StudioTable.Row>
      </StudioTable.Head>
      <StudioTable.Body>
        {rows.map(({ instance, collectionKey }) => (
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
            <StudioTable.Cell>
              <WorkflowHealthCell {...resolveRowHealth(collectionKey, health)} />
            </StudioTable.Cell>
          </StudioTable.Row>
        ))}
      </StudioTable.Body>
      {hasMoreResults && (
        <StudioTable.Foot>
          <StudioTable.Row>
            <StudioTable.Cell className={classes.footerCell} colSpan={COLUMN_COUNT}>
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
