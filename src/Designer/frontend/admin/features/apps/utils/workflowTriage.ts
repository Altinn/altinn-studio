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
  WorkflowHealth.AuxiliaryWorkflowFailed,
]);

/** A timestamp as a number, or nothing for an absent or unparsable one. */
export function toTime(value: string | null | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}

/** A workflow the process waits on, as opposed to an auxiliary workflow running beside it. */
export const isPrimaryWorkflow = (workflow: WorkflowStatus): boolean => workflow.role === 'primary';

export const isFailedWorkflow = (workflow: WorkflowStatus): boolean =>
  FAILED_WORKFLOW_STATUSES.includes(workflow.overallStatus);

export const isActiveWorkflow = (workflow: WorkflowStatus): boolean =>
  ACTIVE_WORKFLOW_STATUSES.includes(workflow.overallStatus);

/**
 * The label the app runtime puts on every workflow of one process transition: the transition's
 * own workflow, the auxiliary workflows it spawned, and a receive workflow parked on its service
 * task. The value names the target task and the flow number, so two visits to the same task differ.
 */
export const TRANSITION_LABEL = 'processNextTargetId';

/**
 * The label naming the task a process transition leaves, with its flow number. The app runtime puts
 * it on the workflow that takes the instance for the transition and on the transition itself, and
 * on the auxiliary workflows of a transition that ends the process, which has no target.
 */
export const SOURCE_LABEL = 'processNextSourceId';

/** The one step of the workflow that takes the instance before a transition the user asked for. */
const ACQUIRE_STEP = 'AcquireProcessingStatus';

export type WorkflowGroup = {
  /** The workflow the row is named for: the transition, or the only workflow the group has. */
  workflow: WorkflowStatus;
  /**
   * The workflows the row shows as one, in the order they ran: taking the instance, the transition
   * itself, then the stages of the task it enters that ran as workflows of their own.
   */
  members: WorkflowStatus[];
  /** The auxiliary workflows of this transition, in the order they came. */
  auxiliaryWorkflows: WorkflowStatus[];
};

/** A workflow that only takes the instance, ahead of the transition the user asked for. */
export const isAcquireWorkflow = (workflow: WorkflowStatus): boolean =>
  workflow.steps.length === 1 && workflow.steps[0].operationId === ACQUIRE_STEP;

/**
 * The workflows of an instance as a service owner thinks of them: one group per process
 * transition. The app runtime runs a transition the user asked for as several workflows — one that
 * takes the instance, the transition itself, a workflow per stage of the task it enters that waits
 * on its own, and an auxiliary workflow per piece of work beside the process — and the panel
 * shows them as one row:
 *
 * - The workflow that takes the instance opens the group, and the transition with the same source
 *   label joins it.
 * - A primary workflow with the target label of a transition already in the list and no source
 *   label of its own is a stage of the task that transition entered, and joins its group.
 * - An auxiliary workflow joins the transition with its target label, or with its source label
 *   when it has no target: the auxiliary workflows of ending the process.
 *
 * Everything else is a group of its own, including the transitions the process makes on its own
 * after a service task, since each is a transition of its own. Groups keep the order their first
 * workflow came in.
 */
export function groupTransitions(workflows: WorkflowStatus[]): WorkflowGroup[] {
  const groups: WorkflowGroup[] = [];
  const bySource = new Map<string, WorkflowGroup>();
  const byTarget = new Map<string, WorkflowGroup>();

  const startGroup = (workflow: WorkflowStatus): WorkflowGroup => {
    const group = { workflow, members: [workflow], auxiliaryWorkflows: [] };
    groups.push(group);
    return group;
  };

  for (const workflow of workflows) {
    const source = workflow.labels?.[SOURCE_LABEL];
    const target = workflow.labels?.[TRANSITION_LABEL];

    if (!isPrimaryWorkflow(workflow)) {
      const parent =
        (target !== undefined ? byTarget.get(target) : undefined) ??
        (target === undefined && source !== undefined ? bySource.get(source) : undefined);
      if (parent) {
        parent.auxiliaryWorkflows.push(workflow);
      } else {
        startGroup(workflow);
      }
      continue;
    }

    if (isAcquireWorkflow(workflow)) {
      const group = startGroup(workflow);
      if (source !== undefined) {
        bySource.set(source, group);
      }
      continue;
    }

    const acquired = source !== undefined ? bySource.get(source) : undefined;
    const stageOf = source === undefined && target !== undefined ? byTarget.get(target) : undefined;
    if (acquired && acquired.members.every(isAcquireWorkflow)) {
      acquired.members.push(workflow);
      acquired.workflow = workflow;
      if (target !== undefined) {
        byTarget.set(target, acquired);
      }
    } else if (stageOf) {
      stageOf.members.push(workflow);
    } else {
      const group = startGroup(workflow);
      if (source !== undefined) {
        bySource.set(source, group);
      }
      if (target !== undefined) {
        byTarget.set(target, group);
      }
    }
  }
  return groups;
}

/**
 * The workflow a group's row speaks for: the first that has not completed, which is where the
 * transition stopped, since the workflows of a group run one after another. The last one once all
 * have completed.
 */
export function groupFocusWorkflow(group: WorkflowGroup): WorkflowStatus {
  return (
    group.members.find((workflow) => workflow.overallStatus !== 'Completed') ??
    group.members[group.members.length - 1]
  );
}

/** How long a settled group took, from its first workflow's creation to its last update. */
export function groupElapsed(group: WorkflowGroup): number | undefined {
  const starts = group.members.map((workflow) => toTime(workflow.createdAt));
  const ends = group.members.map((workflow) => toTime(workflow.updatedAt));
  if (starts.includes(undefined) || ends.includes(undefined)) {
    return undefined;
  }
  const start = Math.min(...(starts as number[]));
  const end = Math.max(...(ends as number[]));
  return end >= start ? end - start : undefined;
}

/**
 * The separator the app runtime puts between the transition and the command in an auxiliary
 * workflow's operation id: `Process next side-effects: Form -> Verify · MovedToAltinnEvent`.
 */
const AUXILIARY_WORKFLOW_SEPARATOR = ' · ';

/**
 * What an auxiliary workflow is called on its own row: the part after the separator, since the part
 * before repeats the transition it is filed under. One named some other way keeps its whole id.
 */
export function auxiliaryWorkflowName(auxiliaryWorkflow: WorkflowStatus): string {
  const separatorAt = auxiliaryWorkflow.operationId.lastIndexOf(AUXILIARY_WORKFLOW_SEPARATOR);
  return separatorAt === -1
    ? auxiliaryWorkflow.operationId
    : auxiliaryWorkflow.operationId.slice(separatorAt + AUXILIARY_WORKFLOW_SEPARATOR.length);
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
 * primary workflow retrying, then a failed auxiliary workflow, then a primary workflow waiting on
 * an outcome or a message, then any work in flight.
 */
export function deriveInstanceHealth(workflows: WorkflowStatus[]): WorkflowHealth {
  if (!workflows.length) {
    return WorkflowHealth.NoData;
  }
  const primary = workflows.filter(isPrimaryWorkflow);
  if (primary.some(isFailedWorkflow)) {
    return WorkflowHealth.Failed;
  }
  if (primary.some(isWorkflowRetrying)) {
    return WorkflowHealth.Retrying;
  }
  if (workflows.some((workflow) => !isPrimaryWorkflow(workflow) && isFailedWorkflow(workflow))) {
    return WorkflowHealth.AuxiliaryWorkflowFailed;
  }
  if (primary.some(isWorkflowWaiting)) {
    return WorkflowHealth.Waiting;
  }
  if (primary.some(isWorkflowHeld)) {
    return WorkflowHealth.Held;
  }
  if (workflows.some(isActiveWorkflow)) {
    return WorkflowHealth.Active;
  }
  return WorkflowHealth.Healthy;
}

/**
 * The workflow the instance's verdict rests on: the newest one that produces the health, whatever
 * order the list came in. For a settled instance it is the latest primary workflow.
 */
export function pickFocusWorkflow(
  workflows: WorkflowStatus[],
  health: WorkflowHealth,
): WorkflowStatus | undefined {
  const newestFirst = workflows.toSorted(
    (first, second) => (toTime(second.createdAt) ?? 0) - (toTime(first.createdAt) ?? 0),
  );
  const primary = newestFirst.filter(isPrimaryWorkflow);
  switch (health) {
    case WorkflowHealth.Failed:
      return primary.find(isFailedWorkflow);
    case WorkflowHealth.Retrying:
      return primary.find(isWorkflowRetrying);
    case WorkflowHealth.AuxiliaryWorkflowFailed:
      return newestFirst.find(
        (workflow) => !isPrimaryWorkflow(workflow) && isFailedWorkflow(workflow),
      );
    case WorkflowHealth.Waiting:
      return primary.find(isWorkflowWaiting);
    case WorkflowHealth.Held:
      return primary.find(isWorkflowHeld);
    case WorkflowHealth.Active:
      return primary.find(isActiveWorkflow) ?? newestFirst.find(isActiveWorkflow);
    default:
      return primary[0] ?? newestFirst[0];
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
