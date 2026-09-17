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
import { Fragment, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowsCirclepathIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useFetchMoreResults } from 'admin/features/apps/hooks/useFetchMoreResults';
import { useInstanceWorkflowsQuery } from 'admin/features/apps/hooks/queries/useInstanceWorkflowsQuery';
import type { WorkflowOpsContext } from 'admin/features/apps/hooks/mutations/useWorkflowOpsMutations';
import { useNow } from 'admin/features/apps/hooks/useNow';
import type {
  PersistentItemStatus,
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
import { formatTimestamp } from 'admin/features/apps/utils/formatTimestamp';
import { formatDuration } from 'admin/features/apps/utils/formatDuration';
import { extractInstanceGuid } from 'admin/features/apps/utils/workflowHealth';
import {
  attentionWorkflowOf,
  focusStepOf,
  isActiveWorkflow,
  failedAttemptCount,
  newestFirst,
  orderedSteps,
  toTime,
} from 'admin/features/apps/utils/workflowTriage';
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
        {workflows.map((workflow) => (
          <WorkflowItem
            key={workflow.databaseId}
            context={context}
            workflow={workflow}
            defaultOpen={workflow.databaseId === attentionWorkflowId}
          />
        ))}
      </div>
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
 * One workflow as a row of plain columns: status, name, the steps as dots, the step it is at, a
 * retry count, a spinner and what the engine is doing with it while it still has it, and when it
 * was created. Behind the row: the steps with their errors — and, on the step the workflow
 * stopped at, the verbs that apply.
 */
const WorkflowItem = ({ context, workflow, defaultOpen }: WorkflowItemProps) => {
  const { t } = useTranslation();
  const now = useNow(isActiveWorkflow(workflow));
  const attempts = failedAttemptCount(workflow);
  const liveNote = liveNoteOf(workflow, now, t);
  // Named while the chain is unfinished; a finished one needs no word beside its dots.
  const currentStep = focusStepOf(workflow);
  const currentStepName =
    currentStep && currentStep.status !== 'Completed' ? currentStep.operationId : undefined;

  // A row blinks once when the workflow lands in a settled status. Not on every read that touches
  // it: a retrying workflow changes every attempt, and a blink per attempt is noise. The change is
  // caught by comparing with the previous render's status (the React pattern for remembering the
  // last props), and the summary span is keyed by the count so the blink replays each time — the
  // disclosure around it stays put.
  const [previousStatus, setPreviousStatus] = useState(workflow.overallStatus);
  const [changeCount, setChangeCount] = useState(0);
  if (workflow.overallStatus !== previousStatus) {
    setPreviousStatus(workflow.overallStatus);
    if (!isActiveWorkflow(workflow)) {
      setChangeCount((count) => count + 1);
    }
  }

  const summaryClasses = [classes.summary, changeCount > 0 && classes.summaryChanged]
    .filter(Boolean)
    .join(' ');

  return (
    <StudioDetails defaultOpen={defaultOpen} data-testid='workflow-row'>
      <StudioDetails.Summary className={classes.summaryBar}>
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
          <span className={classes.summaryProgress}>
            <span className={classes.summaryDots}>
              <WorkflowStepStrip workflow={workflow} />
            </span>
            <span className={classes.summaryStep}>{currentStepName}</span>
            <span className={classes.summaryAttempts}>
              {attempts > 0 && (
                <span
                  className={classes.attempts}
                  title={t('admin.workflows.row.attempts', { count: attempts })}
                  aria-label={t('admin.workflows.row.attempts', { count: attempts })}
                >
                  <ArrowsCirclepathIcon aria-hidden='true' />
                  {attempts}
                </span>
              )}
            </span>
            <span className={classes.summaryLive}>
              {isActiveWorkflow(workflow) && (
                <StudioSpinner data-size='xs' aria-label={t('admin.workflows.health.active')} />
              )}
              {liveNote && <span>{liveNote}</span>}
            </span>
          </span>
          <span className={classes.summaryDate}>{formatTimestamp(workflow.createdAt)}</span>
        </span>
      </StudioDetails.Summary>
      <StudioDetails.Content className={classes.details}>
        <WorkflowSteps context={context} workflow={workflow} />
      </StudioDetails.Content>
    </StudioDetails>
  );
};

/**
 * A note only reads well when it stands still for a while. The engine's first backoffs are a
 * second or two, and most attempts run well under a second, so a countdown or a running time
 * under this threshold would flip on every read; below it the spinner says enough.
 */
const LIVE_NOTE_THRESHOLD_MS = 5_000;

/**
 * What a workflow in flight is up to right now, when that is worth a word: how long the current
 * attempt has run, once it has run a while, or when a parked one is due again, once that is a
 * while away. Ticks with the row's clock. Nothing for a settled workflow.
 */
function liveNoteOf(
  workflow: WorkflowStatus,
  now: number,
  t: ReturnType<typeof useTranslation>['t'],
): string | undefined {
  if (workflow.overallStatus === 'Processing') {
    const since = toTime(workflow.executionStartedAt);
    return since !== undefined && now - since >= LIVE_NOTE_THRESHOLD_MS
      ? t('admin.workflows.row.running_for', { duration: formatDuration(now - since, t) })
      : undefined;
  }
  if (PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus)) {
    const due = toTime(workflow.backoffUntil);
    return due !== undefined && due - now >= LIVE_NOTE_THRESHOLD_MS
      ? t('admin.workflows.row.next_attempt_in', { duration: formatDuration(due - now, t) })
      : undefined;
  }
  return undefined;
}

/**
 * The steps, with the ops verbs on the one the workflow stopped at. The verbs act on the workflow
 * — a resume picks up from that step, a write-off covers the whole workflow — but that step is
 * where an operator is looking, and where the work continues from.
 */
const WorkflowSteps = ({
  context,
  workflow,
}: {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
}) => {
  const { t } = useTranslation();
  const steps = orderedSteps(workflow);
  const focusStep = focusStepOf(workflow);

  if (!steps.length) {
    return <WorkflowActions context={context} workflow={workflow} />;
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
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {steps.map((step) => {
            const hasVerbs = step === focusStep && hasWorkflowVerbs(workflow);
            const hasDetails = hasStepDetails(step) || hasVerbs;
            return (
              <Fragment key={step.databaseId}>
                <StudioTable.Row className={hasDetails ? classes.stepRowWithDetails : undefined}>
                  <StudioTable.Cell>{step.operationId}</StudioTable.Cell>
                  <StudioTable.Cell>
                    <WorkflowStatusTag status={step.status} />
                  </StudioTable.Cell>
                  <StudioTable.Cell>{step.errorHistory?.length ?? 0}</StudioTable.Cell>
                  <StudioTable.Cell>
                    {formatTimestamp(step.updatedAt, 'milliseconds')}
                  </StudioTable.Cell>
                </StudioTable.Row>
                {/* What the step has to say — and, on the step the workflow stopped at, the verbs
                    right under its latest error — gets the whole width, on a row of its own. */}
                {hasDetails && (
                  <StudioTable.Row>
                    <StudioTable.Cell
                      colSpan={STEP_COLUMN_COUNT}
                      className={classes.stepDetailsCell}
                    >
                      <StepDetails
                        step={step}
                        verbs={
                          hasVerbs && <WorkflowActions context={context} workflow={workflow} />
                        }
                      />
                    </StudioTable.Cell>
                  </StudioTable.Row>
                )}
              </Fragment>
            );
          })}
        </StudioTable.Body>
      </StudioTable>
    </div>
  );
};

/** Operation, status, retries, last changed: what a details row spans. */
const STEP_COLUMN_COUNT = 4;

/** Whether the ops verbs apply to the workflow at all, so a details row is worth drawing for them. */
function hasWorkflowVerbs(workflow: WorkflowStatus): boolean {
  return (
    RESUMABLE_WORKFLOW_STATUSES.includes(workflow.overallStatus) ||
    PARKED_WORKFLOW_STATUSES.includes(workflow.overallStatus)
  );
}

/** Whether a step has anything to say beyond its status: a defer reason or an error. */
function hasStepDetails(step: WorkflowStepStatus): boolean {
  return Boolean(step.lastDeferReason) || (step.errorHistory?.length ?? 0) > 0;
}

/** Statuses in which a step's latest error is the current problem, not history. */
const STEP_FAILING_STATUSES: readonly PersistentItemStatus[] = [
  'Failed',
  'Canceled',
  'DependencyFailed',
  'Requeued',
];

/**
 * A step's own account of what happened: what it is waiting for, its current error in full, and —
 * on the step the workflow stopped at — the verbs, right under that error. Every other error folds
 * away under a count: the earlier attempts of a step that keeps failing, or the whole history of a
 * step that has since succeeded — still there, since the failure happened, but out of the way.
 */
const StepDetails = ({ step, verbs }: { step: WorkflowStepStatus; verbs?: ReactNode }) => {
  const { t } = useTranslation();
  const deferReason = step.lastDeferReason;
  const errors = newestFirst(step.errorHistory ?? []);
  const isFailing = STEP_FAILING_STATUSES.includes(step.status);
  const currentError = isFailing ? errors[0] : undefined;
  const earlierErrors = isFailing ? errors.slice(1) : errors;
  const historyLabel =
    step.status === 'Completed'
      ? t('admin.workflows.step.resolved_errors', { count: earlierErrors.length })
      : t('admin.workflows.step.earlier_errors', { count: earlierErrors.length });

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
      {currentError && <EngineErrorMessage entry={currentError} />}
      {verbs}
      {earlierErrors.length > 0 && (
        <StudioDetails data-size='sm' className={classes.earlierErrors}>
          <StudioDetails.Summary>{historyLabel}</StudioDetails.Summary>
          <StudioDetails.Content className={classes.earlierErrorsList}>
            {earlierErrors.map((entry, index) => (
              <EngineErrorMessage key={`${entry.timestamp}-${index}`} entry={entry} />
            ))}
          </StudioDetails.Content>
        </StudioDetails>
      )}
    </div>
  );
};
