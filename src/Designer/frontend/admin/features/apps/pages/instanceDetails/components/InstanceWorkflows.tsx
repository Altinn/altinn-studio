import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioDetails,
  StudioHeading,
  StudioParagraph,
  StudioSpinner,
  StudioTable,
  StudioTag,
} from '@studio/components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetchMoreResults } from 'admin/features/apps/hooks/useFetchMoreResults';
import { useInstanceWorkflowsQuery } from 'admin/features/apps/hooks/queries/useInstanceWorkflowsQuery';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import { useNow } from 'admin/features/apps/hooks/useNow';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import {
  PARKED_WORKFLOW_STATUSES,
  RESUMABLE_WORKFLOW_STATUSES,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { EngineErrorMessage } from 'admin/features/apps/components/EngineErrorMessage/EngineErrorMessage';
import { WorkflowEngineError } from 'admin/features/apps/components/WorkflowEngineError/WorkflowEngineError';
import { WorkflowStatusTag } from 'admin/features/apps/components/WorkflowStatusTag/WorkflowStatusTag';
import { formatDateAndTime } from 'admin/features/apps/utils/formatDateAndTime';
import { formatDuration } from 'admin/features/apps/utils/formatDuration';
import { extractInstanceGuid } from 'admin/features/apps/utils/workflowHealth';
import {
  attentionWorkflowOf,
  isActiveWorkflow,
  maxRetryCount,
  newestFirst,
  orderedSteps,
  toTime,
} from 'admin/features/apps/utils/workflowTriage';
import { InstanceWorkflowNotices } from './InstanceWorkflowNotices';
import { WorkflowActions } from './WorkflowActions';
import { WorkflowStepStrip } from './WorkflowStepStrip';

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

  return (
    <StudioCard>
      <StudioHeading data-size='sm'>{t('admin.workflows.title')}</StudioHeading>
      <StudioParagraph data-size='sm' className={classes.description}>
        {t('admin.workflows.description')}
      </StudioParagraph>
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
  // failure comes up with its message and verbs in view — and stays theirs to close after that.
  const now = useNow((workflows ?? []).some(isActiveWorkflow));
  const attentionWorkflowId = workflows
    ? attentionWorkflowOf(workflows, now)?.databaseId
    : undefined;

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
      <InstanceWorkflowNotices workflows={workflows} />
      {workflows.map((workflow) => (
        <WorkflowItem
          key={workflow.databaseId}
          context={context}
          workflow={workflow}
          defaultOpen={workflow.databaseId === attentionWorkflowId}
        />
      ))}
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
    </div>
  );
};

type WorkflowItemProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
  /** Open when the row first appears. The operator owns the state from then on. */
  defaultOpen: boolean;
};

/**
 * One workflow as a row: what it is, where it is in its steps, how many attempts it has made, how
 * long it ran or has been running, and when a parked one tries again — with the verbs that apply
 * at the row's right edge. Behind the row: the steps with their errors, and the id.
 *
 * The verbs sit beside the disclosure in the DOM, not inside its summary: a summary is itself a
 * button, and buttons (and their dialogs) inside it are neither valid nor reliably reachable.
 * They are placed over the row's right edge, and the row keeps that edge clear.
 */
const WorkflowItem = ({ context, workflow, defaultOpen }: WorkflowItemProps) => {
  const { t } = useTranslation();
  const now = useNow(isActiveWorkflow(workflow));
  const attempts = maxRetryCount(workflow);
  const liveNote = liveNoteOf(workflow, now, t);
  const hasVerbs =
    RESUMABLE_WORKFLOW_STATUSES.includes(workflow.overallStatus) ||
    PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus);

  // A row that just changed blinks once. The change is counted from the previous render's
  // timestamp (the React pattern for remembering the last props), and the summary span is keyed
  // by the count so the blink replays on every change — the disclosure around it stays put.
  const [previousUpdatedAt, setPreviousUpdatedAt] = useState(workflow.updatedAt);
  const [changeCount, setChangeCount] = useState(0);
  if (workflow.updatedAt !== previousUpdatedAt) {
    setPreviousUpdatedAt(workflow.updatedAt);
    setChangeCount((count) => count + 1);
  }

  const summaryClasses = [
    classes.summary,
    changeCount > 0 && classes.summaryChanged,
    hasVerbs && classes.summaryWithVerbs,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes.row}>
      <StudioDetails defaultOpen={defaultOpen}>
        <StudioDetails.Summary>
          <span key={changeCount} className={summaryClasses}>
            <span className={classes.summaryStatus}>
              <WorkflowStatusTag status={workflow.overallStatus} />
            </span>
            <span className={classes.summaryName}>
              <span className={classes.summaryOperation} title={workflow.operationId}>
                {workflow.operationId}
              </span>
              {workflow.isHead === false && (
                <StudioTag data-size='sm' data-color='neutral'>
                  {t('admin.workflows.side_effect')}
                </StudioTag>
              )}
            </span>
            <WorkflowStepStrip workflow={workflow} />
            <span className={classes.summaryMeta}>
              {attempts > 0 && (
                <span>{t('admin.workflows.row.attempts', { count: attempts })}</span>
              )}
              {liveNote && <span>{liveNote}</span>}
              <span>{formatDateAndTime(workflow.createdAt)}</span>
            </span>
          </span>
        </StudioDetails.Summary>
        <StudioDetails.Content className={classes.details}>
          <WorkflowSteps workflow={workflow} />
          <span className={classes.workflowId}>
            {t('admin.workflows.id')}: <code>{workflow.databaseId}</code>
          </span>
        </StudioDetails.Content>
      </StudioDetails>
      <div className={classes.rowVerbs}>
        <WorkflowActions context={context} workflow={workflow} />
      </div>
    </div>
  );
};

/**
 * What a workflow in flight is up to right now: how long the current attempt has run, or when a
 * parked one is due again. Ticks with the row's clock. Nothing for a settled workflow.
 */
function liveNoteOf(
  workflow: WorkflowStatus,
  now: number,
  t: ReturnType<typeof useTranslation>['t'],
): string | undefined {
  if (workflow.overallStatus === 'Processing') {
    const since = toTime(workflow.executionStartedAt);
    return since === undefined
      ? undefined
      : t('admin.workflows.row.running_for', { duration: formatDuration(now - since, t) });
  }
  if (PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus)) {
    const due = toTime(workflow.backoffUntil);
    if (due === undefined) {
      return undefined;
    }
    return due > now
      ? t('admin.workflows.row.next_attempt_in', { duration: formatDuration(due - now, t) })
      : t('admin.workflows.row.next_attempt_now');
  }
  return undefined;
}

const WorkflowSteps = ({ workflow }: { workflow: WorkflowStatus }) => {
  const { t } = useTranslation();
  const steps = orderedSteps(workflow);

  if (!steps.length) {
    return null;
  }

  return (
    <div className={classes.steps}>
      <StudioTable data-size='sm'>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.Cell>{t('admin.workflows.operation')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.status')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.step.retries')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.instances.last_changed')}</StudioTable.Cell>
            <StudioTable.Cell>{t('admin.workflows.step.details')}</StudioTable.Cell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {steps.map((step) => (
            <StudioTable.Row key={step.databaseId}>
              <StudioTable.Cell>{step.operationId}</StudioTable.Cell>
              <StudioTable.Cell>
                <WorkflowStatusTag status={step.status} />
              </StudioTable.Cell>
              <StudioTable.Cell>{step.retryCount}</StudioTable.Cell>
              <StudioTable.Cell>{formatDateAndTime(step.updatedAt)}</StudioTable.Cell>
              <StudioTable.Cell>
                <StepDetails step={step} />
              </StudioTable.Cell>
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
    </div>
  );
};

/**
 * A step's own account of what happened: what it is waiting for, and its latest error in full.
 * Earlier errors — one per attempt, so a retried step can have many — stay behind a toggle:
 * they are the same failure over and over more often than not.
 */
const StepDetails = ({ step }: { step: WorkflowStepStatus }) => {
  const { t } = useTranslation();
  const [isHistoryShown, setIsHistoryShown] = useState(false);
  const deferReason = step.lastDeferReason;
  const [latestError, ...earlierErrors] = newestFirst(step.errorHistory ?? []);

  if (!deferReason && !latestError) {
    return <span>-</span>;
  }

  // The engine leaves the last defer reason on the step after it stops waiting, so only a step that
  // is actually parked may read as currently blocked. On any other step the same text is history,
  // which is worth keeping for triage under a label that says so.
  const deferReasonLabel =
    step.status === 'Waiting'
      ? t('admin.workflows.step.waiting_reason')
      : t('admin.workflows.step.last_waiting_reason');

  return (
    <div className={classes.stepDetails}>
      {/* Engine-provided free text (defer reasons) is rendered as its own node rather than
          interpolated into a translation, since i18next HTML-escapes interpolations. It is also
          set apart as verbatim technical output: the app runtime writes these in English, so they
          must not read as part of the Norwegian sentence around them. */}
      {deferReason && (
        <span>
          {deferReasonLabel}: <code className={classes.engineText}>{deferReason}</code>
        </span>
      )}
      {(step.deferCount ?? 0) > 1 && (
        <span>{t('admin.workflows.step.defer_count', { times: step.deferCount })}</span>
      )}
      {latestError && <EngineErrorMessage entry={latestError} />}
      {earlierErrors.length > 0 && (
        <div className={classes.earlierErrors}>
          <StudioButton
            data-size='sm'
            variant='tertiary'
            aria-expanded={isHistoryShown}
            onClick={() => setIsHistoryShown((shown) => !shown)}
          >
            {isHistoryShown
              ? t('admin.workflows.step.hide_earlier_errors')
              : t('admin.workflows.step.show_earlier_errors', { count: earlierErrors.length })}
          </StudioButton>
          {isHistoryShown &&
            earlierErrors.map((entry, index) => (
              <EngineErrorMessage key={`${entry.timestamp}-${index}`} entry={entry} />
            ))}
        </div>
      )}
    </div>
  );
};
