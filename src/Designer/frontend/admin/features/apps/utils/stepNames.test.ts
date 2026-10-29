import { describe, expect, it } from 'vitest';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { PROCESS_ELEMENT_LABEL } from 'admin/features/apps/utils/workflowPhases';
import { STEP_NAME_LABEL, stepDisplayName } from './stepNames';

const stepOf = (operationId: string, labels?: Record<string, string>): WorkflowStepStatus => ({
  databaseId: 'step',
  operationId,
  processingOrder: 0,
  status: 'Completed',
  command: { type: 'app' },
  retryCount: 0,
  labels,
});

const workflowOf = (operationId: string, labels?: Record<string, string>): WorkflowStatus => ({
  databaseId: 'wf',
  operationId,
  idempotencyKey: 'key',
  namespace: 'ttd/app',
  createdAt: '2026-10-13T10:00:00Z',
  role: 'Primary',
  overallStatus: 'Completed',
  steps: [],
  labels,
});

const transition = workflowOf('Process next: Form -> Approval', {
  processNextTargetTask: 'Approval',
});
const receiver = workflowOf('Mailbox receive: Approval · 0', { processNextTargetTask: 'Approval' });

describe('stepDisplayName', () => {
  it('names a step by the method it runs, whichever pipeline it belongs to', () => {
    const stage = stepOf('ExecuteServiceTask: 0', { [STEP_NAME_LABEL]: 'Send to archive' });
    const lifecycle = stepOf('EndTask: 1', { [STEP_NAME_LABEL]: 'Revoke signee rights' });
    expect(stepDisplayName(stage, transition, textMock)).toBe('Send to archive');
    expect(stepDisplayName(lifecycle, transition, textMock)).toBe('Revoke signee rights');
  });

  it('names an unnamed lifecycle step by what the transition does to its task', () => {
    const start = stepOf('StartTask: 0', { [PROCESS_ELEMENT_LABEL]: 'Approval' });
    const end = stepOf('EndTask: 1', { [PROCESS_ELEMENT_LABEL]: 'Form' });
    const abandon = stepOf('AbandonTask: 0', { [PROCESS_ELEMENT_LABEL]: 'Form' });
    expect(stepDisplayName(start, transition, textMock)).toBe(
      textMock('admin.workflows.step.position.task_start', { number: 1, task: 'Approval' }),
    );
    expect(stepDisplayName(end, transition, textMock)).toBe(
      textMock('admin.workflows.step.position.task_end', { number: 2, task: 'Form' }),
    );
    expect(stepDisplayName(abandon, transition, textMock)).toBe(
      textMock('admin.workflows.step.position.task_abandon', { number: 1, task: 'Form' }),
    );
  });

  it('keeps the command name of a lifecycle step that names no task', () => {
    expect(stepDisplayName(stepOf('EndTask: 0'), transition, textMock)).toBe('EndTask: 0');
  });

  it('names an unnamed service task step by its position in the task, counted from one', () => {
    expect(stepDisplayName(stepOf('ExecuteServiceTask: 0'), transition, textMock)).toBe(
      textMock('admin.workflows.step.position.stage_in_task', { number: 1, task: 'Approval' }),
    );
    expect(stepDisplayName(stepOf('MintMailbox: 0'), transition, textMock)).toBe(
      textMock('admin.workflows.step.position.mint_mailbox', { number: 1 }),
    );
    expect(stepDisplayName(stepOf('ExecuteServiceTask: 1'), receiver, textMock)).toBe(
      textMock('admin.workflows.step.position.replies', { number: 2 }),
    );
    expect(stepDisplayName(stepOf('ExecuteServiceTask: 2'), workflowOf('Legacy'), textMock)).toBe(
      textMock('admin.workflows.step.position.stage', { number: 3 }),
    );
  });

  it('keeps the command name of every other step', () => {
    expect(stepDisplayName(stepOf('EndTask'), transition, textMock)).toBe('EndTask');
  });
});
