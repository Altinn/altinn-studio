import {
  StudioAlert,
  StudioButton,
  StudioError,
  StudioParagraph,
  StudioSpinner,
  StudioTable,
} from '@studio/components';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentOrg } from 'admin/contexts/OrgContext';
import { useEnvironmentTitle } from 'admin/features/apps/hooks/useEnvironmentTitle';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import type { WorkflowProblems as WorkflowProblemsData } from 'admin/features/apps/hooks/queries/useWorkflowProblemsQuery';
import { useWorkflowProblemsQuery } from 'admin/features/apps/hooks/queries/useWorkflowProblemsQuery';
import type { CollectionFailureFilter } from 'admin/features/apps/types/workflows/WorkflowCollection';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';
import { isEngineUnavailableError } from 'admin/features/apps/utils/workflowHealth';
import { StatusFilter } from 'admin/features/apps/pages/instances/components/StatusFilter';

import classes from './WorkflowProblems.module.css';

const FAILURE_FILTER_OPTIONS: { label: string; value: CollectionFailureFilter }[] = [
  { label: 'admin.workflows.problems.filter.any', value: 'any' },
  { label: 'admin.workflows.problems.filter.visible', value: 'visible' },
  { label: 'admin.workflows.problems.filter.invisible', value: 'invisible' },
];

const DEFAULT_FAILURE_FILTER: CollectionFailureFilter = 'any';

export type WorkflowProblemsProps = {
  org: string;
  environment: string;
  app: string;
};

/**
 * Discovery view: the instances the workflow engine holds failures for, so an operator can find
 * them without paging through every instance in Storage.
 */
export const WorkflowProblems = ({ org, environment, app }: WorkflowProblemsProps) => {
  const { t } = useTranslation();
  const [failures, setFailures] = useQueryParamState<CollectionFailureFilter>(
    'workflowFailures',
    DEFAULT_FAILURE_FILTER,
  );
  const activeFilter = failures ?? DEFAULT_FAILURE_FILTER;

  const { data, status, error, fetchNextPage, hasNextPage } = useWorkflowProblemsQuery(
    org,
    environment,
    app,
    activeFilter,
  );

  return (
    <div className={classes.container}>
      <StudioParagraph data-size='sm'>{t('admin.workflows.problems.description')}</StudioParagraph>
      <div className={classes.filterWrapper}>
        <StatusFilter
          label='admin.workflows.problems.filter'
          value={activeFilter}
          setValue={setFailures}
          options={FAILURE_FILTER_OPTIONS}
        />
      </div>
      <WorkflowProblemsContent
        environment={environment}
        status={status}
        error={error}
        data={data}
        hasMoreResults={hasNextPage}
        fetchMoreResults={fetchNextPage}
      />
    </div>
  );
};

type WorkflowProblemsContentProps = {
  environment: string;
  status: 'pending' | 'error' | 'success';
  error: unknown;
  data?: WorkflowProblemsData;
  hasMoreResults: boolean;
  fetchMoreResults: () => Promise<unknown>;
};

const WorkflowProblemsContent = ({
  environment,
  status,
  error,
  data,
  hasMoreResults,
  fetchMoreResults,
}: WorkflowProblemsContentProps) => {
  const { t } = useTranslation();
  const currentOrg = useCurrentOrg();
  const orgName = currentOrg.full_name || currentOrg.username;
  const envTitle = useEnvironmentTitle(environment);

  switch (status) {
    case 'pending':
      return <StudioSpinner aria-label={t('general.loading')} />;
    case 'error':
      if (isEngineUnavailableError(error)) {
        return (
          <StudioAlert data-color='info'>
            {t('admin.workflows.unavailable', { envTitle })}
          </StudioAlert>
        );
      }
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
        <WorkflowProblemsTable
          collections={data?.collections ?? []}
          totalCount={data?.totalCount ?? 0}
          hasMoreResults={hasMoreResults}
          fetchMoreResults={fetchMoreResults}
        />
      );
  }
};

type WorkflowProblemsTableProps = {
  collections: WorkflowProblemsData['collections'];
  totalCount: number;
  hasMoreResults: boolean;
  fetchMoreResults: () => Promise<unknown>;
};

const COLUMN_COUNT = 5;

const WorkflowProblemsTable = ({
  collections,
  totalCount,
  hasMoreResults,
  fetchMoreResults,
}: WorkflowProblemsTableProps) => {
  const { t } = useTranslation();
  const { isPending: isFetchingMoreResults, mutate: doFetchMoreResults } = useMutation({
    mutationFn: fetchMoreResults,
  });

  if (!collections.length) {
    return <StudioAlert data-color='info'>{t('admin.workflows.problems.no_results')}</StudioAlert>;
  }

  return (
    <>
      <StudioParagraph data-size='sm'>
        {t('admin.workflows.problems.total', { total: totalCount })}
      </StudioParagraph>
      <StudioTable>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.Cell>{t('admin.instances.id')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.problems.failed_visible')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.problems.failed_invisible')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.health.active')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.instances.last_changed')}</StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {collections.map((collection) => (
            <StudioTable.Row key={collection.key}>
              <StudioTable.Cell>
                {/* The collection key is the bare instance GUID, which is also the instance-details
                  route parameter, so the failing instance links straight through. */}
                <Link to={`instances/${collection.key}`}>{collection.key}</Link>
              </StudioTable.Cell>
              <StudioTable.Cell>{collection.workflowCounts?.failedVisible ?? '-'}</StudioTable.Cell>
              <StudioTable.Cell>
                {collection.workflowCounts?.failedInvisible ?? '-'}
              </StudioTable.Cell>
              <StudioTable.Cell>{collection.workflowCounts?.active ?? '-'}</StudioTable.Cell>
              <StudioTable.Cell>
                {formatDateAndTime(collection.updatedAt ?? collection.createdAt)}
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
                  {t('admin.workflows.problems.fetch_more')}
                </StudioButton>
              </StudioTable.Cell>
            </StudioTable.Row>
          </StudioTable.Foot>
        )}
      </StudioTable>
    </>
  );
};
