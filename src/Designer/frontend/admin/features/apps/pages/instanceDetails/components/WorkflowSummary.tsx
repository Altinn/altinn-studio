import { StudioTag } from '@studio/components';
import { useState } from 'react';
import { ArrowsCirclepathIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { useNow } from 'admin/features/apps/hooks/useNow';
import type { WorkflowStatus } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { PARKED_WORKFLOW_STATUSES } from 'admin/features/apps/types/workflows/WorkflowStatus';
import {
  WorkflowStatusIcon,
  WorkflowStatusTag,
} from 'admin/features/apps/components/WorkflowStatusTag/WorkflowStatusTag';
import { formatTimeOfDay, formatTimestamp } from 'admin/features/apps/utils/formatTimestamp';
import { formatDuration, formatElapsed } from 'admin/features/apps/utils/formatDuration';
import type { WorkflowGroup } from 'admin/features/apps/utils/workflowTriage';
import {
  failedAttemptCount,
  focusStepOf,
  groupElapsed,
  groupFocusWorkflow,
  isActiveWorkflow,
  isFailedWorkflow,
  isPrimaryWorkflow,
  toTime,
} from 'admin/features/apps/utils/workflowTriage';
import { stepDisplayName } from 'admin/features/apps/utils/stepNames';
import { useTaskNameOf } from 'admin/features/apps/hooks/useTaskNames';
import { WorkflowStepStrip } from './WorkflowStepStrip';

import classes from './WorkflowSummary.module.css';

/** The kind of workflow nearly every row is, now that a transition's workflows share one row. */
const PROCESS_NEXT_KIND = 'Process next';

/**
 * A note only reads well when it stands still for a while. The engine's first backoffs are a
 * second or two, and most attempts run well under a second, so a countdown or a running time
 * under this threshold would flip on every read; below it the spinner says enough.
 */
const LIVE_NOTE_THRESHOLD_MS = 5_000;

export type WorkflowSummaryProps = {
  group: WorkflowGroup;
};

/**
 * A transition's row. Its status and current step are those of the workflow the transition stopped
 * at, and the dots, attempts and duration cover all its workflows. Only a row that did not complete
 * spells its status out, so the rows that need a look stand out down a long list.
 */
export const WorkflowSummary = ({ group }: WorkflowSummaryProps) => {
  const { t } = useTranslation();
  const taskNameOf = useTaskNameOf();
  const { workflow, members, auxiliaryWorkflows } = group;
  const focus = groupFocusWorkflow(group);
  const status = focus.overallStatus;
  const isActive = members.some(isActiveWorkflow);
  const now = useNow(isActive);
  const attempts = members.reduce((sum, member) => sum + failedAttemptCount(member), 0);
  const liveNote = liveNoteOf(focus, now, t);
  // How long it took, once it is done; while it runs, the live note speaks for it.
  const elapsed = isActive ? undefined : groupElapsed(group);
  const elapsedText = elapsed === undefined ? undefined : formatElapsed(elapsed, t);
  // Once the main workflow is done, only failed auxiliary workflows need a note on its row.
  const failedAuxiliaryWorkflows = auxiliaryWorkflows.filter(isFailedWorkflow).length;
  const auxiliaryWorkflowNote =
    failedAuxiliaryWorkflows > 0
      ? t('admin.workflows.row.auxiliary_workflows_failed', { count: failedAuxiliaryWorkflows })
      : undefined;

  // Named while the chain is unfinished; a finished one needs no word beside its dots.
  const currentStep = focusStepOf(focus);
  const currentStepName =
    currentStep && currentStep.status !== 'Completed'
      ? stepDisplayName(currentStep, focus, t, taskNameOf)
      : undefined;

  // A row blinks once when it lands in a settled status. Not on every read that touches it: a
  // retrying workflow changes every attempt, and a blink per attempt is noise. The change is caught
  // by comparing with the previous render's status (the React pattern for remembering the last
  // props), and the summary span is keyed by the count so the blink replays each time — the
  // disclosure around it stays put.
  const [previousStatus, setPreviousStatus] = useState(status);
  const [changeCount, setChangeCount] = useState(0);
  if (status !== previousStatus) {
    setPreviousStatus(status);
    if (!isActiveWorkflow(focus)) {
      setChangeCount((count) => count + 1);
    }
  }

  const summaryClasses = [classes.summary, changeCount > 0 && classes.summaryChanged]
    .filter(Boolean)
    .join(' ');

  return (
    <span key={changeCount} className={summaryClasses}>
      <span className={classes.summaryStatus}>
        <WorkflowStatusIcon status={status} />
      </span>
      <span className={classes.summaryName}>
        <OperationName operationId={workflow.operationId} />
        {!isPrimaryWorkflow(workflow) && (
          <StudioTag data-size='sm' data-color='neutral'>
            {t('admin.workflows.auxiliary_workflow')}
          </StudioTag>
        )}
      </span>
      <span className={classes.summaryProgress}>
        <span className={classes.summaryDots}>
          <WorkflowStepStrip workflows={members} />
        </span>
        <span className={classes.summaryStep}>
          {status !== 'Completed' && (
            <span className={classes.stepStatus}>
              <WorkflowStatusTag status={status} />
            </span>
          )}
          {currentStepName}
          {currentStepName && liveNote && ' · '}
          {liveNote}
          {!currentStepName && !liveNote && auxiliaryWorkflowNote && (
            <span className={classes.auxiliaryWorkflowsFailedNote}>{auxiliaryWorkflowNote}</span>
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
      <span className={classes.summaryTime} title={formatTimestamp(members[0].createdAt)}>
        {formatTimeOfDay(members[0].createdAt)}
      </span>
    </span>
  );
};

/**
 * A workflow's operation id with what sets it apart first: the part after the colon, with task ids
 * as the task names in the app's process, and the kind only when it is not a plain transition.
 * Down a list the eye then reads the transitions. The id as it came is the tooltip.
 */
const OperationName = ({ operationId }: { operationId: string }) => {
  const taskNameOf = useTaskNameOf();
  const colon = operationId.indexOf(': ');
  if (colon === -1) {
    return <span className={classes.summaryOperation}>{operationId}</span>;
  }
  const kind = operationId.slice(0, colon);
  const subject = operationId
    .slice(colon + 2)
    .split(' -> ')
    .map(taskNameOf)
    .join(' → ');
  return (
    <span className={classes.summaryOperation} title={operationId}>
      <span className={classes.operationSubject}>{subject}</span>
      {kind !== PROCESS_NEXT_KIND && (
        <>
          {' '}
          <span className={classes.operationKind}>{kind}</span>
        </>
      )}
    </span>
  );
};

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
