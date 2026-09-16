import type {
  WorkflowErrorEntry,
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { FAILED_WORKFLOW_STATUSES } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowHealth } from './workflowHealth';
import { ACTIVE_WORKFLOW_STATUSES } from './workflowRefetch';

/**
 * Consecutive failed attempts on one step from which a requeued workflow reads as stuck rather than
 * as work in flight. The engine's default backoff starts at a second and doubles, so three attempts
 * is a step that has failed for a few seconds running — past a single blip, before the operator
 * would otherwise have to wait for the retry budget (a day) to run out.
 */
export const RETRYING_ATTEMPT_THRESHOLD = 3;

/** A backoff this far ahead means the engine has already backed off many times. */
export const RETRYING_BACKOFF_THRESHOLD_MS = 5 * 60_000;

/**
 * Work in flight with no change for this long is worth a second look: a step that neither finishes
 * nor fails usually means the app is not answering.
 */
export const STALE_ACTIVE_THRESHOLD_MS = 60 * 60_000;

/** The verdicts that mean an operator may have to act. */
export const ATTENTION_HEALTHS: ReadonlySet<WorkflowHealth> = new Set([
  WorkflowHealth.Failed,
  WorkflowHealth.Retrying,
  WorkflowHealth.SideEffectsFailed,
]);

/** The verdicts a recovery lands on: the work is moving again, or done. */
export const RECOVERED_HEALTHS: ReadonlySet<WorkflowHealth> = new Set([
  WorkflowHealth.Active,
  WorkflowHealth.Healthy,
]);

/** A timestamp as a number, or nothing for an absent or unparsable one. */
export function toTime(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

/** Visible to the collection head frontier: part of the process, as opposed to a side chain. */
export const isVisibleWorkflow = (workflow: WorkflowStatus): boolean => workflow.isHead !== false;

export const isFailedWorkflow = (workflow: WorkflowStatus): boolean =>
  FAILED_WORKFLOW_STATUSES.includes(workflow.overallStatus);

export const isActiveWorkflow = (workflow: WorkflowStatus): boolean =>
  ACTIVE_WORKFLOW_STATUSES.includes(workflow.overallStatus);

/** The most attempts any one step of the workflow has made after its first. */
export function maxRetryCount(workflow: WorkflowStatus): number {
  return workflow.steps.reduce((max, step) => Math.max(max, step.retryCount ?? 0), 0);
}

/**
 * A requeued workflow that has failed enough times, or is backed off far enough, to read as stuck.
 * `Waiting` is not retrying: a deferral is a successful attempt whose outcome is not ready yet.
 */
export function isWorkflowRetrying(workflow: WorkflowStatus, now: number = Date.now()): boolean {
  if (workflow.overallStatus !== 'Requeued') {
    return false;
  }
  if (maxRetryCount(workflow) >= RETRYING_ATTEMPT_THRESHOLD) {
    return true;
  }
  const due = toTime(workflow.backoffUntil);
  return due !== undefined && due - now > RETRYING_BACKOFF_THRESHOLD_MS;
}

/**
 * The traffic light for an instance, from the workflows the engine holds for it.
 *
 * The same precedence as the collection rollup — a blocked process outranks lost side effects,
 * which outrank work in flight — with one state the rollup cannot express: a visible workflow that
 * keeps failing and retrying is stuck for the user even though the engine has not given up.
 */
export function deriveInstanceHealth(
  workflows: WorkflowStatus[],
  now: number = Date.now(),
): WorkflowHealth {
  if (!workflows.length) {
    return WorkflowHealth.NoData;
  }
  const visible = workflows.filter(isVisibleWorkflow);
  if (visible.some(isFailedWorkflow)) {
    return WorkflowHealth.Failed;
  }
  if (visible.some((workflow) => isWorkflowRetrying(workflow, now))) {
    return WorkflowHealth.Retrying;
  }
  if (workflows.some((workflow) => !isVisibleWorkflow(workflow) && isFailedWorkflow(workflow))) {
    return WorkflowHealth.SideEffectsFailed;
  }
  if (workflows.some(isActiveWorkflow)) {
    return WorkflowHealth.Active;
  }
  return WorkflowHealth.Healthy;
}

/**
 * The workflow the instance's verdict rests on: the first one, in the given order, that produces
 * the health. For a settled instance it is the first visible workflow, which is the latest
 * transition when the list is newest first.
 */
export function pickFocusWorkflow(
  workflows: WorkflowStatus[],
  health: WorkflowHealth,
  now: number = Date.now(),
): WorkflowStatus | undefined {
  const visible = workflows.filter(isVisibleWorkflow);
  switch (health) {
    case WorkflowHealth.Failed:
      return visible.find(isFailedWorkflow);
    case WorkflowHealth.Retrying:
      return visible.find((workflow) => isWorkflowRetrying(workflow, now));
    case WorkflowHealth.SideEffectsFailed:
      return workflows.find(
        (workflow) => !isVisibleWorkflow(workflow) && isFailedWorkflow(workflow),
      );
    case WorkflowHealth.Active:
      return visible.find(isActiveWorkflow) ?? workflows.find(isActiveWorkflow);
    default:
      return visible[0] ?? workflows[0];
  }
}

/**
 * How long a workflow in flight has gone without a change, when that is long enough to worry
 * about. Nothing for a settled workflow, or one that changed recently.
 */
export function staleSpanOf(
  workflow: WorkflowStatus | undefined,
  now: number = Date.now(),
): number | undefined {
  if (!workflow || !isActiveWorkflow(workflow)) {
    return undefined;
  }
  const lastChanged = toTime(workflow.updatedAt);
  if (lastChanged === undefined) {
    return undefined;
  }
  const span = now - lastChanged;
  return span > STALE_ACTIVE_THRESHOLD_MS ? span : undefined;
}

/**
 * The workflow an operator should be looking at, if any: the one the verdict rests on when the
 * verdict needs attention, or the one in flight that has gone quiet.
 */
export function attentionWorkflowOf(
  workflows: WorkflowStatus[],
  now: number = Date.now(),
): WorkflowStatus | undefined {
  const health = deriveInstanceHealth(workflows, now);
  const focus = pickFocusWorkflow(workflows, health, now);
  if (!focus) {
    return undefined;
  }
  return ATTENTION_HEALTHS.has(health) || staleSpanOf(focus, now) !== undefined ? focus : undefined;
}

export function orderedSteps(workflow: WorkflowStatus): WorkflowStepStatus[] {
  return (workflow.steps ?? []).toSorted(
    (first, second) => first.processingOrder - second.processingOrder,
  );
}

/** The step a workflow is at: the first that has not completed, or the last one once all have. */
export function focusStepOf(workflow: WorkflowStatus): WorkflowStepStatus | undefined {
  const steps = orderedSteps(workflow);
  return steps.find((step) => step.status !== 'Completed') ?? steps.at(-1);
}

/** Newest first, so the error that matters is the one read first. */
export function newestFirst(entries: WorkflowErrorEntry[]): WorkflowErrorEntry[] {
  return entries.toSorted(
    (first, second) => (toTime(second.timestamp) ?? 0) - (toTime(first.timestamp) ?? 0),
  );
}

/** The most recent error any step of the workflow recorded. */
export function latestErrorOf(workflow: WorkflowStatus): WorkflowErrorEntry | undefined {
  return newestFirst((workflow.steps ?? []).flatMap((step) => step.errorHistory ?? []))[0];
}
