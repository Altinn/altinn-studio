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
import {
  WorkflowStatusIcon,
  WorkflowStatusMark,
  WorkflowStatusTag,
} from 'admin/features/apps/components/WorkflowStatusTag/WorkflowStatusTag';
import {
  formatDay,
  formatTimeOfDay,
  formatTimestamp,
} from 'admin/features/apps/utils/formatTimestamp';
import { formatDuration, formatElapsed } from 'admin/features/apps/utils/formatDuration';
import { extractInstanceGuid } from 'admin/features/apps/utils/workflowHealth';
import {
  attentionWorkflowOf,
  elapsedOf,
  focusStepOf,
  isActiveWorkflow,
  isFailedWorkflow,
  failedAttemptCount,
  groupSideChains,
  sideChainName,
  newestFirst,
  orderedSteps,
  toTime,
} from 'admin/features/apps/utils/workflowTriage';
import {
  groupStepsByPhase,
  parseTransition,
  phaseElementId,
} from 'admin/features/apps/utils/workflowPhases';
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
        {groupSideChains(workflows).map(({ workflow, sideChains }, index, groups) => {
          const day = formatDay(workflow.createdAt);
          const isNewDay = index === 0 || day !== formatDay(groups[index - 1].workflow.createdAt);
          return (
            <Fragment key={workflow.databaseId}>
              {isNewDay && <div className={classes.dayHeading}>{day}</div>}
              <WorkflowItem
                context={context}
                workflow={workflow}
                sideChains={sideChains}
                defaultOpen={
                  workflow.databaseId === attentionWorkflowId || sideChains.some(isFailedWorkflow)
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
  workflow: WorkflowStatus;
  /** The side chains this workflow spawned, shown behind its row with its steps. */
  sideChains: WorkflowStatus[];
  /** Open when the row first appears. The operator owns the state from then on. */
  defaultOpen: boolean;
};

/**
 * One workflow as a row, and behind it everything it has to say: the steps with their errors —
 * and, on the step the workflow stopped at, the verbs that apply — then the side chains it
 * spawned. A side chain is rarely what anyone came to look at, so the row only counts them; one
 * that failed says so on the row and opens it.
 */
const WorkflowItem = ({ context, workflow, sideChains, defaultOpen }: WorkflowItemProps) => (
  <StudioDetails defaultOpen={defaultOpen} data-testid='workflow-row'>
    <StudioDetails.Summary className={classes.summaryBar}>
      <WorkflowSummary workflow={workflow} sideChains={sideChains} />
    </StudioDetails.Summary>
    <StudioDetails.Content className={classes.details}>
      <WorkflowSteps context={context} workflow={workflow} sideChains={sideChains} />
    </StudioDetails.Content>
  </StudioDetails>
);

type SideChainItemProps = {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
};

/** One side chain: a row like a step's, and its error and verbs under it when it has any. */
const SideChainRow = ({ context, workflow }: SideChainItemProps) => {
  const step = focusStepOf(workflow);
  const hasVerbs = hasWorkflowVerbs(workflow);
  const failures = failedAttemptCount(workflow);
  const showDetails =
    step !== undefined &&
    workflow.overallStatus !== 'Completed' &&
    (hasStepDetails(step) || hasVerbs);

  return (
    <Fragment>
      <StudioTable.Row
        className={showDetails ? classes.stepRowWithDetails : undefined}
        data-testid='side-chain-row'
      >
        <StudioTable.Cell className={classes.groupedCell}>
          {sideChainName(workflow)}
        </StudioTable.Cell>
        <StudioTable.Cell>
          <WorkflowStatusMark status={workflow.overallStatus} />
        </StudioTable.Cell>
        <StudioTable.Cell className={classes.numberCell}>
          {failures > 0 && failures}
        </StudioTable.Cell>
        <StudioTable.Cell
          className={classes.timeCell}
          title={formatTimestamp(workflow.updatedAt ?? workflow.createdAt, 'milliseconds')}
        >
          {formatTimeOfDay(workflow.updatedAt ?? workflow.createdAt, 'milliseconds')}
        </StudioTable.Cell>
      </StudioTable.Row>
      {showDetails && (
        <StudioTable.Row>
          <StudioTable.Cell
            colSpan={STEP_COLUMN_COUNT}
            className={`${classes.stepDetailsCell} ${classes.groupedCell}`}
          >
            <StepDetails
              step={step}
              verbs={hasVerbs && <WorkflowActions context={context} workflow={workflow} />}
            />
          </StudioTable.Cell>
        </StudioTable.Row>
      )}
    </Fragment>
  );
};

/**
 * A workflow's operation id, all of it, in two weights: what sets this workflow apart — the part
 * after the colon, a transition's arrow drawn as an arrow — first and in full, and the kind of
 * workflow the rows share — `Process next`, `Mailbox receive` — after it, quiet. Down a list the
 * eye then reads the transitions, not the same two words on every row. The id as it came is in the
 * tooltip.
 */
const OperationName = ({ operationId }: { operationId: string }) => {
  const colon = operationId.indexOf(': ');
  if (colon === -1) {
    return <span className={classes.summaryOperation}>{operationId}</span>;
  }
  const kind = operationId.slice(0, colon);
  const subject = operationId.slice(colon + 2).replace(' -> ', ' → ');
  return (
    <span className={classes.summaryOperation} title={operationId}>
      <span className={classes.operationSubject}>{subject}</span>{' '}
      <span className={classes.operationKind}>{kind}</span>
    </span>
  );
};

type WorkflowSummaryProps = {
  workflow: WorkflowStatus;
  /** The side chains behind this row, counted in place of the step it is at once it is done. */
  sideChains?: WorkflowStatus[];
};

/**
 * A workflow as a row of plain columns: its status as an icon, its name, the steps as dots, where
 * it is and what the engine is doing with it, the failed attempts, how long it took, and the time
 * it was created.
 *
 * Built to be scanned down a long list: the icons down the left edge say at a glance which rows
 * did not go fine, and only those rows spell their status out, as a tag beside the step it
 * concerns. The numbers keep to the right edge, where they line up from row to row.
 */
const WorkflowSummary = ({ workflow, sideChains = [] }: WorkflowSummaryProps) => {
  const { t } = useTranslation();
  const now = useNow(isActiveWorkflow(workflow));
  const attempts = failedAttemptCount(workflow);
  const liveNote = liveNoteOf(workflow, now, t);
  // How long it took, once it is done; while it runs, the live note speaks for it.
  const elapsed = isActiveWorkflow(workflow) ? undefined : elapsedOf(workflow);
  const elapsedText = elapsed === undefined ? undefined : formatElapsed(elapsed, t);
  // Where the step's name would be once the chain is done: how many side chains it spawned, and
  // whether any of them failed — the one thing about them worth a word before anyone opens the row.
  const failedSideChains = sideChains.filter(isFailedWorkflow).length;
  const sideChainNote =
    sideChains.length === 0
      ? undefined
      : failedSideChains > 0
        ? t('admin.workflows.row.side_chains_failed', { count: failedSideChains })
        : t('admin.workflows.row.side_chains', { count: sideChains.length });

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
    <span key={changeCount} className={summaryClasses}>
      <span className={classes.summaryStatus}>
        <WorkflowStatusIcon status={workflow.overallStatus} />
      </span>
      <span className={classes.summaryName}>
        <OperationName operationId={workflow.operationId} />
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
        <span className={classes.summaryStep}>
          {workflow.overallStatus !== 'Completed' && (
            <span className={classes.stepStatus}>
              <WorkflowStatusTag status={workflow.overallStatus} />
            </span>
          )}
          {currentStepName}
          {currentStepName && liveNote && ' · '}
          {liveNote}
          {!currentStepName && !liveNote && sideChainNote && (
            <span className={failedSideChains > 0 ? classes.sideChainsFailedNote : undefined}>
              {sideChainNote}
            </span>
          )}
        </span>
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
        <span className={classes.summaryDuration}>
          {elapsedText && (
            <span
              title={t('admin.workflows.row.duration', { duration: elapsedText })}
              aria-label={t('admin.workflows.row.duration', { duration: elapsedText })}
            >
              {elapsedText}
            </span>
          )}
        </span>
      </span>
      <span className={classes.summaryTime} title={formatTimestamp(workflow.createdAt)}>
        {formatTimeOfDay(workflow.createdAt)}
      </span>
    </span>
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
  sideChains,
}: {
  context: WorkflowOpsContext;
  workflow: WorkflowStatus;
  /** The side chains this workflow spawned, listed after its steps in the same columns. */
  sideChains: WorkflowStatus[];
}) => {
  const { t } = useTranslation();
  const steps = orderedSteps(workflow);
  const focusStep = focusStepOf(workflow);
  const transition = parseTransition(workflow);

  if (!steps.length && sideChains.length === 0) {
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
          {groupStepsByPhase(steps).map((group) => {
            // A phase of the transition — ending one task, starting the next — is headed by the
            // task it concerns, with its steps set in under it. Steps of no phase, and a phase whose
            // task the transition does not name, keep to the left edge.
            const heading = group.phase && phaseElementId(group.phase, transition);
            const indent = heading ? classes.groupedCell : undefined;
            return (
              <Fragment key={group.steps[0].databaseId}>
                {heading && <GroupHeading>{heading}</GroupHeading>}
                {group.steps.map((step) => {
                  const hasVerbs = step === focusStep && hasWorkflowVerbs(workflow);
                  const hasDetails = hasStepDetails(step) || hasVerbs;
                  const failures = step.errorHistory?.length ?? 0;
                  return (
                    <Fragment key={step.databaseId}>
                      <StudioTable.Row
                        className={hasDetails ? classes.stepRowWithDetails : undefined}
                      >
                        <StudioTable.Cell className={indent}>{step.operationId}</StudioTable.Cell>
                        <StudioTable.Cell>
                          <WorkflowStatusMark status={step.status} />
                        </StudioTable.Cell>
                        <StudioTable.Cell className={classes.numberCell}>
                          {failures > 0 && failures}
                        </StudioTable.Cell>
                        <StudioTable.Cell
                          className={classes.timeCell}
                          title={formatTimestamp(step.updatedAt, 'milliseconds')}
                        >
                          {formatTimeOfDay(step.updatedAt, 'milliseconds')}
                        </StudioTable.Cell>
                      </StudioTable.Row>
                      {/* What the step has to say — and, on the step the workflow stopped at, the
                          verbs right under its latest error — gets the whole width, on a row of its
                          own, set in with the step. */}
                      {hasDetails && (
                        <StudioTable.Row>
                          <StudioTable.Cell
                            colSpan={STEP_COLUMN_COUNT}
                            className={[classes.stepDetailsCell, indent].filter(Boolean).join(' ')}
                          >
                            <StepDetails
                              step={step}
                              verbs={
                                hasVerbs && (
                                  <WorkflowActions context={context} workflow={workflow} />
                                )
                              }
                            />
                          </StudioTable.Cell>
                        </StudioTable.Row>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            );
          })}
          {/* The side chains this transition spawned: the same four columns, in the same table, so
              they line up with the steps instead of measuring their own. */}
          {sideChains.length > 0 && (
            <>
              <GroupHeading>{t('admin.workflows.side_chains')}</GroupHeading>
              {sideChains.map((sideChain) => (
                <SideChainRow key={sideChain.databaseId} context={context} workflow={sideChain} />
              ))}
            </>
          )}
        </StudioTable.Body>
      </StudioTable>
    </div>
  );
};

/** Operation, status, retries, last changed: what a details row spans. */
const STEP_COLUMN_COUNT = 4;

/**
 * A heading inside the steps table — the task a phase concerns, or the side chains — on a row of
 * its own with no rule under it: it names the rows set in under it rather than being one of them.
 */
const GroupHeading = ({ children }: { children: ReactNode }) => (
  <StudioTable.Row className={classes.groupHeadingRow}>
    <StudioTable.Cell colSpan={STEP_COLUMN_COUNT} className={classes.groupHeading}>
      {children}
    </StudioTable.Cell>
  </StudioTable.Row>
);

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
