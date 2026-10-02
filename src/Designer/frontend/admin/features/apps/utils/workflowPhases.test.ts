import type {
  PersistentItemStatus,
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { groupStepsByPhase, parseTransition, phaseElementId, stepPhase } from './workflowPhases';

const step = (
  operationId: string,
  status: PersistentItemStatus = 'Completed',
): WorkflowStepStatus => ({
  databaseId: operationId,
  operationId,
  processingOrder: 0,
  status,
  command: { type: 'app' },
  retryCount: 0,
});

const named = (operationId: string): WorkflowStatus => ({
  databaseId: 'wf',
  operationId,
  idempotencyKey: 'key',
  namespace: 'ttd/app',
  createdAt: '2026-09-21T13:29:56Z',
  overallStatus: 'Completed',
  steps: [],
});

describe('stepPhase', () => {
  it('places the task lifecycle steps and leaves the rest without a phase', () => {
    expect(stepPhase(step('OnTaskEndingHook'))).toBe('end');
    expect(stepPhase(step('StartTask'))).toBe('start');
    expect(stepPhase(step('OnProcessEndingHook'))).toBe('processEnd');
    expect(stepPhase(step('MutateProcessState'))).toBeUndefined();
    expect(stepPhase(step('ExecuteServiceTask: 0'))).toBeUndefined();
  });
});

describe('parseTransition', () => {
  it('reads the tasks from a transition and from its side effects', () => {
    expect(parseTransition(named('Process next: Form -> Verify'))).toEqual({
      from: 'Form',
      to: 'Verify',
    });
    expect(
      parseTransition(named('Process next side-effects: Form -> Verify · MovedToAltinnEvent')),
    ).toEqual({ from: 'Form', to: 'Verify' });
  });

  it('does not read a transition into a workflow named some other way', () => {
    expect(parseTransition(named('Process next: acquire'))).toBeUndefined();
    expect(parseTransition(named('Mailbox receive: Approval · 0'))).toBeUndefined();
  });
});

describe('groupStepsByPhase', () => {
  it('cuts the steps into runs, with steps of no phase in runs of their own', () => {
    const groups = groupStepsByPhase([
      step('EndTask'),
      step('LockTaskData'),
      step('MutateProcessState'),
      step('UnlockTaskData'),
      step('StartTask'),
      step('CommitProcessState'),
      step('ExecuteServiceTask: 0'),
    ]);
    expect(groups.map((group) => [group.phase, group.steps.length])).toEqual([
      ['end', 2],
      [undefined, 1],
      ['start', 2],
      [undefined, 2],
    ]);
  });
});

describe('phaseElementId', () => {
  it('names the task a phase ends or starts, and the end event the process ends at', () => {
    expect(phaseElementId('end', { from: 'Form', to: 'Verify' })).toBe('Form');
    expect(phaseElementId('start', { from: 'Form', to: 'Verify' })).toBe('Verify');
    expect(phaseElementId('processEnd', { from: 'Sign', to: 'EndEvent_1' })).toBe('EndEvent_1');
  });

  it('names nothing when the transition is unknown', () => {
    expect(phaseElementId('start', undefined)).toBeUndefined();
  });
});
