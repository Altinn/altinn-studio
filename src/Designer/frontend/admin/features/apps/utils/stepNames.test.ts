import { textMock } from '@studio/testing/mocks/i18nMock';
import type {
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { STEP_KIND_LABEL, STEP_NAME_LABEL, stepDisplayName } from './stepNames';

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
  overallStatus: 'Completed',
  steps: [],
  labels,
});

const transition = workflowOf('Process next: Form -> Approval', {
  processNextTargetTask: 'Approval',
});
const receiver = workflowOf('Mailbox receive: Approval · 0', { processNextTargetTask: 'Approval' });

describe('stepDisplayName', () => {
  it('names a step by the name the app gave it', () => {
    const step = stepOf('ExecuteServiceTask: 0', {
      [STEP_NAME_LABEL]: 'Send til arkiv',
      [STEP_KIND_LABEL]: 'stage',
    });
    expect(stepDisplayName(step, transition, textMock)).toBe('Send til arkiv');
  });

  it('says what an opening or answering step does for the step it belongs to', () => {
    const mint = stepOf('MintMailbox: 0', {
      [STEP_NAME_LABEL]: 'Send til arkiv',
      [STEP_KIND_LABEL]: 'mintMailbox',
    });
    const replyTo = stepOf('ExecuteServiceTask: 1', {
      [STEP_NAME_LABEL]: 'Send til arkiv',
      [STEP_KIND_LABEL]: 'replyTo',
    });
    expect(stepDisplayName(mint, transition, textMock)).toBe(
      textMock('admin.workflows.step.name.mint_mailbox', { name: 'Send til arkiv' }),
    );
    expect(stepDisplayName(replyTo, receiver, textMock)).toBe(
      textMock('admin.workflows.step.name.reply_to', { name: 'Send til arkiv' }),
    );
  });

  it('names a reply handler with a name of its own by that name', () => {
    const replies = stepOf('ExecuteServiceTask: 1', {
      [STEP_NAME_LABEL]: 'Behandle svar',
      [STEP_KIND_LABEL]: 'replies',
    });
    expect(stepDisplayName(replies, receiver, textMock)).toBe('Behandle svar');
  });

  it('names an unnamed step by its position in the task, counted from one', () => {
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
