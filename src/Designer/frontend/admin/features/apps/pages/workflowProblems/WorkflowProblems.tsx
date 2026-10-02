import type { ReactElement } from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioParagraph,
  StudioSpinner,
  StudioTable,
} from '@studio/components';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFetchMoreResults } from 'admin/features/apps/hooks/useFetchMoreResults';
import { useQueryParamState } from 'admin/features/apps/hooks/useQueryParamState';
import type { WorkflowProblems as WorkflowProblemsData } from 'admin/features/apps/hooks/queries/useWorkflowProblemsQuery';
import { useWorkflowProblemsQuery } from 'admin/features/apps/hooks/queries/useWorkflowProblemsQuery';
import type { CollectionFailureFilter } from 'admin/features/apps/types/workflows/WorkflowCollection';
import { WorkflowEngineError } from 'admin/features/apps/components/WorkflowEngineError/WorkflowEngineError';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';
import { extractInstanceGuid } from 'admin/features/apps/utils/workflowHealth';
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

  const { data, status, error, fetchNextPage, hasNextPage, isFetchNextPageError } =
    useWorkflowProblemsQuery(org, environment, app, activeFilter);

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
        isFetchMoreError={isFetchNextPageError}
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
  isFetchMoreError: boolean;
};

const WorkflowProblemsContent = ({
  environment,
  status,
  error,
  data,
  hasMoreResults,
  fetchMoreResults,
  isFetchMoreError,
}: WorkflowProblemsContentProps) => {
  const { t } = useTranslation();

  if (status === 'pending') {
    return <StudioSpinner aria-label={t('general.loading')} />;
  }
  // The query is in error whenever any page failed, a later "load more" included. Rows already
  // loaded stay on screen; only a failure with nothing to show becomes the error state.
  if (data === undefined) {
    return <WorkflowEngineError environment={environment} error={error} />;
  }
  return (
    <WorkflowProblemsTable
      collections={data.collections}
      totalCount={data.totalCount}
      hasMoreResults={hasMoreResults}
      fetchMoreResults={fetchMoreResults}
      isFetchMoreError={isFetchMoreError}
    />
  );
};

type WorkflowProblemsTableProps = {
  collections: WorkflowProblemsData['collections'];
  totalCount: number;
  hasMoreResults: boolean;
  fetchMoreResults: () => Promise<unknown>;
  isFetchMoreError: boolean;
};

const COLUMN_COUNT = 5;

const WorkflowProblemsTable = ({
  collections,
  totalCount,
  hasMoreResults,
  fetchMoreResults,
  isFetchMoreError,
}: WorkflowProblemsTableProps) => {
  const { t } = useTranslation();
  const { isFetchingMoreResults, doFetchMoreResults } = useFetchMoreResults(fetchMoreResults);

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
                <InstanceLink collectionKey={collection.key} />
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
                {isFetchMoreError && (
                  <StudioAlert data-color='danger' data-size='sm'>
                    {t('admin.workflows.problems.fetch_more_error')}
                  </StudioAlert>
                )}
                <StudioButton disabled={isFetchingMoreResults} onClick={doFetchMoreResults}>
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

/**
 * The failing instance, linked through to its details page.
 *
 * A collection key is the bare instance GUID for everything the app runtime enqueues, but the
 * engine's key is free-form and the same namespace can hold collections keyed by something else
 * entirely. Only a key that is a usable instance id becomes a link; anything else is shown as it is
 * rather than as a link that leads nowhere.
 */
const InstanceLink = ({ collectionKey }: { collectionKey: string }): ReactElement => {
  const instanceGuid = extractInstanceGuid(collectionKey);

  if (instanceGuid === undefined) {
    return <span>{collectionKey}</span>;
  }
  return <Link to={`instances/${instanceGuid}`}>{collectionKey}</Link>;
};
