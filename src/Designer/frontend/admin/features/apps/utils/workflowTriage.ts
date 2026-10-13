import type {
  WorkflowErrorEntry,
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { FAILED_WORKFLOW_STATUSES } from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowHealth } from './workflowHealth';
import { ACTIVE_WORKFLOW_STATUSES } from './workflowRefetch';

/** The verdicts that mean an operator may have to act. */
export const ATTENTION_HEALTHS: ReadonlySet<WorkflowHealth> = new Set([
  WorkflowHealth.Failed,
  WorkflowHealth.Retrying,
  WorkflowHealth.SideEffectsFailed,
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

/**
 * The label the app runtime puts on every workflow of one process transition: the transition's
 * own workflow, the side chains it spawned, and a receive workflow parked on its service task.
 * The value names the target task and the flow number, so two visits to the same task differ.
 */
export const TRANSITION_LABEL = 'processNextTargetId';

export type WorkflowGroup = {
  workflow: WorkflowStatus;
  /** The side chains of this transition, in the order they came. */
  sideChains: WorkflowStatus[];
};

/**
 * Side chains (non-head workflows) filed under the transition they belong to — the first head
 * workflow carrying the same transition label, which is the transition itself: a receive workflow
 * shares the label but comes later. A side chain whose transition is not in the list, or that
 * carries no label, keeps a group of its own, in place. Head workflows keep the list's order.
 */
export function groupSideChains(workflows: WorkflowStatus[]): WorkflowGroup[] {
  const groups: WorkflowGroup[] = [];
  for (const workflow of workflows) {
    const transition = workflow.labels?.[TRANSITION_LABEL];
    const parent =
      workflow.isHead === false && transition !== undefined
        ? groups.find(
            (group) =>
              group.workflow.isHead !== false &&
              group.workflow.labels?.[TRANSITION_LABEL] === transition,
          )
        : undefined;
    if (parent) {
      parent.sideChains.push(workflow);
    } else {
      groups.push({ workflow, sideChains: [] });
    }
  }
  return groups;
}

/**
 * The separator the app runtime puts between the transition and the side effect in a side chain's
 * operation id: `Process next side-effects: Form -> Verify · MovedToAltinnEvent`.
 */
const SIDE_CHAIN_SEPARATOR = ' · ';

/**
 * What a side chain is called on its own row: the part after the separator, since the part before
 * repeats the transition it is filed under. A side chain named some other way keeps its whole id.
 */
export function sideChainName(sideChain: WorkflowStatus): string {
  const separatorAt = sideChain.operationId.lastIndexOf(SIDE_CHAIN_SEPARATOR);
  return separatorAt === -1
    ? sideChain.operationId
    : sideChain.operationId.slice(separatorAt + SIDE_CHAIN_SEPARATOR.length);
}

/** How long a finished workflow took, from its creation to its last update. */
export function elapsedOf(workflow: WorkflowStatus): number | undefined {
  const created = toTime(workflow.createdAt);
  const updated = toTime(workflow.updatedAt);
  return created !== undefined && updated !== undefined && updated >= created
    ? updated - created
    : undefined;
}

/** Whether any step of the workflow recorded an error, whatever became of it since. */
export function hadErrors(workflow: WorkflowStatus): boolean {
  return (workflow.steps ?? []).some((step) => (step.errorHistory?.length ?? 0) > 0);
}

/**
 * How many attempts the workflow's steps have recorded as failed, however they were retried. The
 * engine's retry counter is zeroed by a manual resume, the error history is not, so this is the
 * count that survives a recovery.
 */
export function failedAttemptCount(workflow: WorkflowStatus): number {
  return (workflow.steps ?? []).reduce((sum, step) => sum + (step.errorHistory?.length ?? 0), 0);
}

/**
 * Waiting to try again after a failed attempt. `Waiting` is not retrying: a deferral is a
 * successful attempt whose outcome is not ready yet.
 */
export const isWorkflowRetrying = (workflow: WorkflowStatus): boolean =>
  workflow.overallStatus === 'Requeued';

/** Parked by a deferral until the outcome it waits for is ready. */
export const isWorkflowWaiting = (workflow: WorkflowStatus): boolean =>
  workflow.overallStatus === 'Waiting';

/** Parked on a mailbox until its message arrives or the mailbox closes. */
export const isWorkflowHeld = (workflow: WorkflowStatus): boolean =>
  workflow.overallStatus === 'Held';

/**
 * The traffic light for an instance, from the workflows the engine holds for it, with the same
 * precedence as the collection rollup (see `deriveWorkflowHealth`): a blocked process, then a
 * visible workflow retrying, then lost side effects, then a visible workflow waiting on an outcome
 * or a message, then any work in flight.
 */
export function deriveInstanceHealth(workflows: WorkflowStatus[]): WorkflowHealth {
  if (!workflows.length) {
    return WorkflowHealth.NoData;
  }
  const visible = workflows.filter(isVisibleWorkflow);
  if (visible.some(isFailedWorkflow)) {
    return WorkflowHealth.Failed;
  }
  if (visible.some(isWorkflowRetrying)) {
    return WorkflowHealth.Retrying;
  }
  if (workflows.some((workflow) => !isVisibleWorkflow(workflow) && isFailedWorkflow(workflow))) {
    return WorkflowHealth.SideEffectsFailed;
  }
  if (visible.some(isWorkflowWaiting)) {
    return WorkflowHealth.Waiting;
  }
  if (visible.some(isWorkflowHeld)) {
    return WorkflowHealth.Held;
  }
  if (workflows.some(isActiveWorkflow)) {
    return WorkflowHealth.Active;
  }
  return WorkflowHealth.Healthy;
}

/**
 * The workflow the instance's verdict rests on: the newest one that produces the health, whatever
 * order the list came in. For a settled instance it is the latest visible workflow.
 */
export function pickFocusWorkflow(
  workflows: WorkflowStatus[],
  health: WorkflowHealth,
): WorkflowStatus | undefined {
  const newestFirst = workflows.toSorted(
    (first, second) => (toTime(second.createdAt) ?? 0) - (toTime(first.createdAt) ?? 0),
  );
  const visible = newestFirst.filter(isVisibleWorkflow);
  switch (health) {
    case WorkflowHealth.Failed:
      return visible.find(isFailedWorkflow);
    case WorkflowHealth.Retrying:
      return visible.find(isWorkflowRetrying);
    case WorkflowHealth.SideEffectsFailed:
      return newestFirst.find(
        (workflow) => !isVisibleWorkflow(workflow) && isFailedWorkflow(workflow),
      );
    case WorkflowHealth.Waiting:
      return visible.find(isWorkflowWaiting);
    case WorkflowHealth.Held:
      return visible.find(isWorkflowHeld);
    case WorkflowHealth.Active:
      return visible.find(isActiveWorkflow) ?? newestFirst.find(isActiveWorkflow);
    default:
      return visible[0] ?? newestFirst[0];
  }
}

/**
 * The workflow an operator should be looking at, if any: the one the verdict rests on, when the
 * verdict needs attention.
 */
export function attentionWorkflowOf(workflows: WorkflowStatus[]): WorkflowStatus | undefined {
  const health = deriveInstanceHealth(workflows);
  return ATTENTION_HEALTHS.has(health) ? pickFocusWorkflow(workflows, health) : undefined;
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
