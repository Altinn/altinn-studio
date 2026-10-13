import type { TFunction } from 'i18next';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';

/** The name the app gave a service task's step, sent by its app libraries as a step label. */
export const STEP_NAME_LABEL = 'serviceTaskStepName';

/**
 * What kind of service task step it is, sent with the name: `stage`, `mintMailbox` (opening the
 * mailbox a stage replies to), `replies` (answering the messages that come back) or `conclusion`.
 */
export const STEP_KIND_LABEL = 'serviceTaskStepKind';

const SERVICE_TASK_STEP = /^ExecuteServiceTask: (\d+)$/;
const MINT_MAILBOX_STEP = /^MintMailbox: (\d+)$/;
const RECEIVE_WORKFLOW_PREFIX = 'Mailbox receive:';
const TARGET_TASK_LABEL = 'processNextTargetTask';

/**
 * What a step is called in the panel. A service task's steps carry a position in the task rather
 * than a name, so they are named the way a service owner can follow: by the name the app gave the
 * step, when its app libraries send one, and otherwise by its position. Every other step keeps the
 * name of its command.
 */
export function stepDisplayName(
  step: WorkflowStepStatus,
  workflow: WorkflowStatus,
  t: TFunction,
): string {
  const name = step.labels?.[STEP_NAME_LABEL];
  if (name) {
    switch (step.labels?.[STEP_KIND_LABEL]) {
      case 'mintMailbox':
        return t('admin.workflows.step.name.mint_mailbox', { name });
      case 'replies':
        return t('admin.workflows.step.name.replies', { name });
      default:
        return name;
    }
  }

  const mint = MINT_MAILBOX_STEP.exec(step.operationId);
  if (mint) {
    return t('admin.workflows.step.position.mint_mailbox', { number: positionOf(mint[1]) });
  }

  const stage = SERVICE_TASK_STEP.exec(step.operationId);
  if (!stage) {
    return step.operationId;
  }
  const number = positionOf(stage[1]);
  if (workflow.operationId.startsWith(RECEIVE_WORKFLOW_PREFIX)) {
    return t('admin.workflows.step.position.replies', { number });
  }
  const task = workflow.labels?.[TARGET_TASK_LABEL];
  return task
    ? t('admin.workflows.step.position.stage_in_task', { number, task })
    : t('admin.workflows.step.position.stage', { number });
}

/** A step's index in its task, counted from one the way people count. */
const positionOf = (index: string): number => Number(index) + 1;
