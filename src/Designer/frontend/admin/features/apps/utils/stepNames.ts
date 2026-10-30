import type { TFunction } from 'i18next';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { PROCESS_ELEMENT_LABEL } from 'admin/features/apps/utils/workflowPhases';
import { TARGET_TASK_LABEL } from 'admin/features/apps/utils/workflowTriage';

/** The name of the method a pipeline step runs, sent by the app libraries as a step label. */
export const STEP_NAME_LABEL = 'stepName';

const SERVICE_TASK_STEP = /^ExecuteServiceTask: (\d+)$/;
const MINT_MAILBOX_STEP = /^MintMailbox: (\d+)$/;
const LIFECYCLE_STEP = /^(StartTask|EndTask|AbandonTask): (\d+)$/;
const RECEIVE_WORKFLOW_PREFIX = 'Mailbox receive:';

const LIFECYCLE_TEXT: Record<string, string> = {
  StartTask: 'admin.workflows.step.position.task_start',
  EndTask: 'admin.workflows.step.position.task_end',
  AbandonTask: 'admin.workflows.step.position.task_abandon',
};

/**
 * What a step is called in the panel. A pipeline step carries a position in its pipeline rather than
 * a name, so it is named the way a service owner can follow: by the name of the method it runs, when
 * its app libraries send one, and otherwise by its position and what the step does to the task.
 * Every other step keeps the name of its command.
 */
export function stepDisplayName(
  step: WorkflowStepStatus,
  workflow: WorkflowStatus,
  t: TFunction,
  taskNameOf: (elementId: string) => string = (elementId) => elementId,
): string {
  const name = step.labels?.[STEP_NAME_LABEL];
  if (name) {
    return name;
  }

  const lifecycle = LIFECYCLE_STEP.exec(step.operationId);
  if (lifecycle) {
    const element = step.labels?.[PROCESS_ELEMENT_LABEL];
    return element
      ? t(LIFECYCLE_TEXT[lifecycle[1]], {
          number: positionOf(lifecycle[2]),
          task: taskNameOf(element),
        })
      : step.operationId;
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
    ? t('admin.workflows.step.position.stage_in_task', { number, task: taskNameOf(task) })
    : t('admin.workflows.step.position.stage', { number });
}

/** A step's index in its pipeline, counted from one the way people count. */
const positionOf = (index: string): number => Number(index) + 1;
