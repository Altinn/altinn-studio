import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioDetails,
  StudioHeading,
  StudioParagraph,
  StudioSpinner,
} from '@studio/components';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchMoreResults } from 'admin/features/apps/hooks/useFetchMoreResults';
import { useInstanceWorkflowsQuery } from 'admin/features/apps/hooks/queries/useInstanceWorkflowsQuery';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import type { WorkflowStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowEngineError } from 'admin/features/apps/components/WorkflowEngineError/WorkflowEngineError';
import { formatDay } from 'admin/features/apps/utils/formatTimestamp';
import { extractInstanceGuid } from 'admin/features/apps/utils/workflowHealth';
import type { WorkflowGroup } from 'admin/features/apps/utils/workflowTriage';
import {
  attentionWorkflowOf,
  groupTransitions,
  isFailedWorkflow,
} from 'admin/features/apps/utils/workflowTriage';
import { TaskNamesContext, useTaskNames } from 'admin/features/apps/hooks/useTaskNames';
import { WorkflowSteps } from './WorkflowSteps';
import { WorkflowSummary } from './WorkflowSummary';

import classes from './InstanceWorkflows.module.css';

export type InstanceWorkflowsProps = {
  org: string;
  environment: string;
  app: string;
  instanceId: string;
};

/**
 * The workflow-engine view of one instance: every workflow enqueued under its collection key, with
 * per-step status, error history and waiting reasons, plus the ops verbs on failures.
 */
export const InstanceWorkflows = ({
  org,
  environment,
  app,
  instanceId,
}: InstanceWorkflowsProps) => {
  const { t } = useTranslation();
  const collectionKey = extractInstanceGuid(instanceId);
  const { data, status, error, fetchNextPage, hasNextPage, isFetchNextPageError } =
    useInstanceWorkflowsQuery(org, environment, app, collectionKey);
  const taskNameOf = useTaskNames(org, environment, app);

  return (
    <StudioCard>
      <StudioHeading data-size='sm'>{t('admin.workflows.title')}</StudioHeading>
      <StudioParagraph data-size='sm' className={classes.description}>
        {t('admin.workflows.description')}
      </StudioParagraph>
      <TaskNamesContext.Provider value={taskNameOf}>
        <InstanceWorkflowsContent
          context={{ org, env: environment, app, collectionKey }}
          environment={environment}
          status={status}
          error={error}
          workflows={data}
          hasMoreResults={hasNextPage}
          fetchMoreResults={fetchNextPage}
          isFetchMoreError={isFetchNextPageError}
        />
      </TaskNamesContext.Provider>
    </StudioCard>
  );
};

type InstanceWorkflowsContentProps = {
  context: WorkflowOpsContext;
  environment: string;
  status: 'pending' | 'error' | 'success';
  error: unknown;
  workflows?: WorkflowStatus[];
  hasMoreResults: boolean;
  fetchMoreResults: () => Promise<unknown>;
  isFetchMoreError: boolean;
};

const InstanceWorkflowsContent = ({
  context,
  environment,
  status,
  error,
  workflows,
  hasMoreResults,
  fetchMoreResults,
  isFetchMoreError,
}: InstanceWorkflowsContentProps) => {
  const { t } = useTranslation();
  const { isFetchingMoreResults, doFetchMoreResults } = useFetchMoreResults(fetchMoreResults);
  // The row an operator should be looking at opens on its own when it first appears — so a
  // failure comes up with its message and actions in view — and stays theirs to close after that.
  const attentionWorkflowId = workflows ? attentionWorkflowOf(workflows)?.databaseId : undefined;

  if (context.collectionKey === undefined) {
    return <StudioAlert data-color='info'>{t('admin.workflows.no_results')}</StudioAlert>;
  }
  if (status === 'pending') {
    return <StudioSpinner aria-label={t('general.loading')} />;
  }
  // The query is in error whenever any page failed, a later "load more" included. Rows already
  // loaded stay on screen; only a failure with nothing to show becomes the error state.
  if (workflows === undefined) {
    return <WorkflowEngineError environment={environment} error={error} />;
  }
  if (!workflows.length) {
    return <StudioAlert data-color='info'>{t('admin.workflows.no_results')}</StudioAlert>;
  }

  return (
    <div className={classes.workflows}>
      {isFetchMoreError && (
        <StudioAlert data-color='danger' data-size='sm'>
          {t('admin.workflows.fetch_more_error')}
        </StudioAlert>
      )}
      {hasMoreResults && (
        <StudioButton
          data-size='sm'
          variant='secondary'
          disabled={isFetchingMoreResults}
          onClick={doFetchMoreResults}
        >
          {isFetchingMoreResults && <StudioSpinner aria-label={t('general.loading')} />}
          {t('admin.workflows.fetch_more')}
        </StudioButton>
      )}
      <div className={classes.rows}>
        {groupTransitions(workflows).map((group, index, groups) => {
          const day = formatDay(group.members[0].createdAt);
          const isNewDay = index === 0 || day !== formatDay(groups[index - 1].members[0].createdAt);
          return (
            <Fragment key={group.members[0].databaseId}>
              {isNewDay && <div className={classes.dayHeading}>{day}</div>}
              <WorkflowItem
                context={context}
                group={group}
                defaultOpen={
                  group.members.some((member) => member.databaseId === attentionWorkflowId) ||
                  group.auxiliaryWorkflows.some(isFailedWorkflow)
                }
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

type WorkflowItemProps = {
  context: WorkflowOpsContext;
  /** The workflows of one transition, shown as one row, with the auxiliary workflows it spawned. */
  group: WorkflowGroup;
  /** Open when the row first appears. The operator owns the state from then on. */
  defaultOpen: boolean;
};

/**
 * One transition as a row that opens onto its steps and the auxiliary workflows it spawned. The row
 * only counts the auxiliary workflows, since they are rarely what anyone came to look at, and says
 * so when one failed.
 */
const WorkflowItem = ({ context, group, defaultOpen }: WorkflowItemProps) => (
  <StudioDetails defaultOpen={defaultOpen} data-testid='workflow-row'>
    <StudioDetails.Summary className={classes.summaryBar}>
      <WorkflowSummary group={group} />
    </StudioDetails.Summary>
    <StudioDetails.Content className={classes.details}>
      <WorkflowSteps context={context} group={group} />
    </StudioDetails.Content>
  </StudioDetails>
);
