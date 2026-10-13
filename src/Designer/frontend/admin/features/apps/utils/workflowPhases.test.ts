import type {
  PersistentItemStatus,
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import {
  groupStepsByElement,
  parseTransition,
  PROCESS_ELEMENT_LABEL,
  phaseElementId,
  stepPhase,
} from './workflowPhases';

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

/** A step as the app runtime labels it: with the BPMN element it runs for. */
const labeled = (operationId: string, element: string): WorkflowStepStatus => ({
  ...step(operationId),
  labels: { [PROCESS_ELEMENT_LABEL]: element },
});

const runsOf = (groups: ReturnType<typeof groupStepsByElement>) =>
  groups.map((group) => [group.elementId, group.steps.map((member) => member.operationId)]);

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

describe('groupStepsByElement', () => {
  const transition = { from: 'Form', to: 'Verify' };

  it('runs the steps by the element their label names, and the steps of no element apart', () => {
    const groups = groupStepsByElement(
      [
        step('AcquireProcessingStatus'),
        labeled('EndTask', 'Form'),
        labeled('LockTaskData', 'Form'),
        step('MutateProcessState'),
        labeled('UnlockTaskData', 'Verify'),
        labeled('StartTask', 'Verify'),
        step('CommitProcessState'),
        step('ExecuteServiceTask: 0'),
      ],
      undefined,
    );
    expect(runsOf(groups)).toEqual([
      [undefined, ['AcquireProcessingStatus']],
      ['Form', ['EndTask', 'LockTaskData']],
      [undefined, ['MutateProcessState']],
      ['Verify', ['UnlockTaskData', 'StartTask']],
      [undefined, ['CommitProcessState', 'ExecuteServiceTask: 0']],
    ]);
  });

  it('takes the label over the command name, so a command it does not know is still placed', () => {
    const groups = groupStepsByElement(
      [labeled('EndTask', 'Form'), labeled('SomeNewTaskEndingCommand', 'Form')],
      transition,
    );
    expect(runsOf(groups)).toEqual([['Form', ['EndTask', 'SomeNewTaskEndingCommand']]]);
  });

  it('trusts the label over the guess from the command name when the two disagree', () => {
    const groups = groupStepsByElement([labeled('StartTask', 'Form')], transition);
    expect(runsOf(groups)).toEqual([['Form', ['StartTask']]]);
  });

  it('names the end event the process ends at', () => {
    const groups = groupStepsByElement([labeled('OnProcessEndingHook', 'EndEvent_1')], undefined);
    expect(runsOf(groups)).toEqual([['EndEvent_1', ['OnProcessEndingHook']]]);
  });

  it('falls back to the command name and the transition for steps without a label', () => {
    const groups = groupStepsByElement(
      [
        step('EndTask'),
        step('LockTaskData'),
        step('MutateProcessState'),
        step('UnlockTaskData'),
        step('StartTask'),
        step('CommitProcessState'),
        step('ExecuteServiceTask: 0'),
      ],
      transition,
    );
    expect(runsOf(groups)).toEqual([
      ['Form', ['EndTask', 'LockTaskData']],
      [undefined, ['MutateProcessState']],
      ['Verify', ['UnlockTaskData', 'StartTask']],
      [undefined, ['CommitProcessState', 'ExecuteServiceTask: 0']],
    ]);
  });

  it('never merges a labeled step with a guessed one, even for the same element', () => {
    const groups = groupStepsByElement(
      [step('EndTask'), labeled('LockTaskData', 'Form')],
      transition,
    );
    expect(groups).toHaveLength(2);
  });

  it('knows the end of the transition but not its element when the transition is unknown', () => {
    const [group] = groupStepsByElement([step('EndTask')], undefined);
    expect(group.key).toBeDefined();
    expect(group.elementId).toBeUndefined();
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
