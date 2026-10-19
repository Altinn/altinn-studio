import type {
  PersistentItemStatus,
  WorkflowErrorEntry,
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowHealth } from './workflowHealth';
import {
  deriveInstanceHealth,
  failedAttemptCount,
  focusStepOf,
  groupElapsed,
  groupFocusWorkflow,
  groupTransitions,
  auxiliaryWorkflowName,
  isWorkflowRetrying,
  latestErrorOf,
  newestFirst,
  pickFocusWorkflow,
} from './workflowTriage';

const step = (
  processingOrder: number,
  status: PersistentItemStatus,
  extra: Partial<WorkflowStepStatus> = {},
): WorkflowStepStatus => ({
  databaseId: `step-${processingOrder}`,
  operationId: `op-${processingOrder}`,
  processingOrder,
  status,
  command: { type: 'app' },
  retryCount: 0,
  ...extra,
});

const workflow = (
  overallStatus: PersistentItemStatus,
  extra: Partial<WorkflowStatus> = {},
): WorkflowStatus => ({
  databaseId: `wf-${overallStatus}-${extra.role ?? 'primary'}`,
  operationId: 'Process next: Pdf -> Sign',
  idempotencyKey: 'key',
  namespace: 'org/app',
  createdAt: '2026-08-02T09:00:00Z',
  role: 'primary',
  overallStatus,
  steps: [],
  ...extra,
});

const error = (timestamp: string, message: string): WorkflowErrorEntry => ({
  timestamp,
  message,
  wasRetryable: true,
});

describe('failedAttemptCount', () => {
  it('counts every recorded error across the steps, whatever the retry counter says', () => {
    const steps = [
      step(0, 'Completed', {
        retryCount: 0,
        errorHistory: [error('2026-08-02T09:01:00Z', 'a'), error('2026-08-02T09:02:00Z', 'b')],
      }),
      step(1, 'Completed', { retryCount: 4, errorHistory: [error('2026-08-02T09:03:00Z', 'c')] }),
      step(2, 'Completed'),
    ];
    expect(failedAttemptCount(workflow('Completed', { steps }))).toBe(3);
  });
});

describe('isWorkflowRetrying', () => {
  it('reads every requeued workflow as retrying, from its first failed attempt', () => {
    const steps = [step(0, 'Requeued', { retryCount: 1 })];
    expect(isWorkflowRetrying(workflow('Requeued', { steps }))).toBe(true);
  });

  it('never reads a waiting workflow as retrying: a deferral is a successful attempt', () => {
    const steps = [step(0, 'Waiting', { retryCount: 9 })];
    expect(isWorkflowRetrying(workflow('Waiting', { steps }))).toBe(false);
  });
});

describe('auxiliaryWorkflowName', () => {
  it('names an auxiliary workflow by what comes after the separator, or by its whole id', () => {
    expect(
      auxiliaryWorkflowName(
        workflow('Completed', {
          operationId: 'Process next side-effects: Form -> Verify · MovedToAltinnEvent',
        }),
      ),
    ).toBe('MovedToAltinnEvent');
    expect(auxiliaryWorkflowName(workflow('Completed', { operationId: 'send-eformidling' }))).toBe(
      'send-eformidling',
    );
  });
});

describe('groupTransitions', () => {
  const labelsOf = (source?: string, target?: string) => ({
    ...(source ? { processNextSourceId: source } : {}),
    ...(target ? { processNextTargetId: target } : {}),
  });
  const transition = (
    id: string,
    source: string | undefined,
    target: string | undefined,
    extra: Partial<WorkflowStatus> = {},
  ) =>
    workflow('Completed', {
      databaseId: id,
      operationId: `Process next: ${source ?? 'start'} -> ${target ?? 'end'}`,
      labels: labelsOf(source, target),
      steps: [step(0, 'Completed', { operationId: 'EndTask' }), step(1, 'Completed')],
      ...extra,
    });
  const acquire = (id: string, source: string) =>
    workflow('Completed', {
      databaseId: id,
      operationId: 'Process next: Mark instance as processing',
      labels: labelsOf(source),
      steps: [step(0, 'Completed', { operationId: 'AcquireProcessingStatus' })],
    });
  const receiver = (id: string, target: string, extra: Partial<WorkflowStatus> = {}) =>
    workflow('Completed', {
      databaseId: id,
      operationId: `Mailbox receive: ${target} · 0`,
      labels: labelsOf(undefined, target),
      steps: [step(0, 'Completed', { operationId: 'ExecuteServiceTask: 1' })],
      ...extra,
    });
  const auxiliaryWorkflow = (id: string, source?: string, target?: string) =>
    workflow('Completed', {
      databaseId: id,
      operationId: 'Process next side-effects: · MovedToAltinnEvent',
      labels: labelsOf(source, target),
      role: 'auxiliary',
    });
  const ids = (workflows: WorkflowStatus[]) => workflows.map((item) => item.databaseId);

  it('shows the workflow that takes the instance and the transition it was for as one row', () => {
    const groups = groupTransitions([
      acquire('a1', 'Form:2'),
      transition('t1', 'Form:2', 'Verify:3'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].workflow.databaseId).toBe('t1');
    expect(ids(groups[0].members)).toEqual(['a1', 't1']);
  });

  it('adds the stages of the task a transition entered that ran as workflows of their own', () => {
    const groups = groupTransitions([
      transition('t1', 'Verify:3', 'Approval:4'),
      receiver('r1', 'Approval:4'),
      auxiliaryWorkflow('s1', 'Verify:3', 'Approval:4'),
    ]);
    expect(groups).toHaveLength(1);
    expect(ids(groups[0].members)).toEqual(['t1', 'r1']);
    expect(ids(groups[0].auxiliaryWorkflows)).toEqual(['s1']);
  });

  it('keeps the transitions the process makes on its own as rows of their own', () => {
    const groups = groupTransitions([
      acquire('a1', 'Form:2'),
      transition('t1', 'Form:2', 'Verify:3'),
      transition('t2', 'Verify:3', 'Approval:4'),
      transition('t3', 'Approval:4', 'Pdf:5'),
    ]);
    expect(groups.map((group) => ids(group.members))).toEqual([['a1', 't1'], ['t2'], ['t3']]);
  });

  it('files the auxiliary workflows of ending the process by the task the transition left', () => {
    const groups = groupTransitions([
      acquire('a1', 'Sign:6'),
      transition('t1', 'Sign:6', undefined),
      auxiliaryWorkflow('s1', 'Sign:6'),
    ]);
    expect(groups).toHaveLength(1);
    expect(ids(groups[0].members)).toEqual(['a1', 't1']);
    expect(ids(groups[0].auxiliaryWorkflows)).toEqual(['s1']);
  });

  it('starts a row with the transition that starts the process, which has no source', () => {
    const groups = groupTransitions([
      transition('t0', undefined, 'Form:2'),
      auxiliaryWorkflow('s0', undefined, 'Form:2'),
    ]);
    expect(groups.map((group) => ids(group.members))).toEqual([['t0']]);
    expect(ids(groups[0].auxiliaryWorkflows)).toEqual(['s0']);
  });

  it('keeps a workflow that takes the instance as a row of its own until its transition comes', () => {
    const groups = groupTransitions([acquire('a1', 'Form:2')]);
    expect(groups.map((group) => ids(group.members))).toEqual([['a1']]);
    expect(groups[0].workflow.databaseId).toBe('a1');
  });

  it('keeps an auxiliary workflow in place when its transition is not in the list or it has no label', () => {
    const groups = groupTransitions([
      auxiliaryWorkflow('s0', 'Form:2', 'Verify:3'),
      transition('t1', 'Verify:3', 'Approval:4'),
      auxiliaryWorkflow('s1'),
    ]);
    expect(ids(groups.map((group) => group.workflow))).toEqual(['s0', 't1', 's1']);
    expect(groups.every((group) => group.auxiliaryWorkflows.length === 0)).toBe(true);
  });

  it('speaks for the workflow the row stopped at, and covers them all in its duration', () => {
    const [group] = groupTransitions([
      { ...acquire('a1', 'Form:2'), updatedAt: '2026-08-02T09:00:01Z' },
      { ...transition('t1', 'Form:2', 'Approval:4'), updatedAt: '2026-08-02T09:00:02Z' },
      receiver('r1', 'Approval:4', { overallStatus: 'Held' }),
    ]);
    expect(groupFocusWorkflow(group).databaseId).toBe('r1');
    expect(groupElapsed(group)).toBeUndefined();

    const [settled] = groupTransitions([
      { ...acquire('a1', 'Form:2'), updatedAt: '2026-08-02T09:00:01Z' },
      { ...transition('t1', 'Form:2', 'Verify:3'), updatedAt: '2026-08-02T09:00:03Z' },
    ]);
    expect(groupFocusWorkflow(settled).databaseId).toBe('t1');
    expect(groupElapsed(settled)).toBe(3_000);
  });
});

describe('deriveInstanceHealth', () => {
  const retrying = workflow('Requeued', { steps: [step(0, 'Requeued', { retryCount: 1 })] });
  const failedAuxiliaryWorkflow = workflow('Failed', { role: 'auxiliary' });

  it('reads no workflows as no data, never as healthy', () => {
    expect(deriveInstanceHealth([])).toBe(WorkflowHealth.NoData);
  });

  it('ranks a blocked process above everything else', () => {
    expect(deriveInstanceHealth([failedAuxiliaryWorkflow, retrying, workflow('Failed')])).toBe(
      WorkflowHealth.Failed,
    );
  });

  it('ranks a primary workflow retrying above a failed auxiliary workflow', () => {
    expect(deriveInstanceHealth([failedAuxiliaryWorkflow, retrying])).toBe(WorkflowHealth.Retrying);
  });

  it('reads a retrying auxiliary workflow as work in flight, not as a stuck process', () => {
    const retryingAuxiliaryWorkflow = workflow('Requeued', {
      role: 'auxiliary',
      steps: [step(0, 'Requeued', { retryCount: 5 })],
    });
    expect(deriveInstanceHealth([retryingAuxiliaryWorkflow])).toBe(WorkflowHealth.Active);
  });

  it('ranks a failed auxiliary workflow above a workflow waiting on an outcome or a message', () => {
    expect(deriveInstanceHealth([workflow('Waiting'), failedAuxiliaryWorkflow])).toBe(
      WorkflowHealth.AuxiliaryWorkflowFailed,
    );
  });

  it('names what a primary workflow waits for, an outcome before a message', () => {
    expect(deriveInstanceHealth([workflow('Held'), workflow('Waiting')])).toBe(
      WorkflowHealth.Waiting,
    );
    expect(deriveInstanceHealth([workflow('Processing'), workflow('Held')])).toBe(
      WorkflowHealth.Held,
    );
    expect(deriveInstanceHealth([workflow('Waiting', { role: 'auxiliary' })])).toBe(
      WorkflowHealth.Active,
    );
  });

  it('ranks a failed auxiliary workflow above work in flight, and that above settled work', () => {
    expect(deriveInstanceHealth([workflow('Processing'), failedAuxiliaryWorkflow])).toBe(
      WorkflowHealth.AuxiliaryWorkflowFailed,
    );
    expect(deriveInstanceHealth([workflow('Completed'), workflow('Processing')])).toBe(
      WorkflowHealth.Active,
    );
    expect(deriveInstanceHealth([workflow('Completed'), workflow('Abandoned')])).toBe(
      WorkflowHealth.Healthy,
    );
  });
});

describe('pickFocusWorkflow', () => {
  it('picks the newest workflow the verdict rests on, whatever order the list came in', () => {
    const olderFailed = workflow('Failed', {
      databaseId: 'older',
      createdAt: '2026-08-02T08:00:00Z',
    });
    const newerFailed = workflow('Failed', {
      databaseId: 'newer',
      createdAt: '2026-08-02T09:30:00Z',
    });
    const failedAuxiliaryWorkflow = workflow('Failed', { role: 'auxiliary' });
    const workflows = [olderFailed, failedAuxiliaryWorkflow, newerFailed];

    expect(pickFocusWorkflow(workflows, WorkflowHealth.Failed)).toBe(newerFailed);
    expect(
      pickFocusWorkflow([failedAuxiliaryWorkflow], WorkflowHealth.AuxiliaryWorkflowFailed),
    ).toBe(failedAuxiliaryWorkflow);
  });

  it('prefers a primary workflow over an auxiliary workflow when both are in flight', () => {
    const auxiliaryWorkflow = workflow('Processing', { role: 'auxiliary' });
    const primaryWorkflow = workflow('Enqueued');
    expect(pickFocusWorkflow([auxiliaryWorkflow, primaryWorkflow], WorkflowHealth.Active)).toBe(
      primaryWorkflow,
    );
  });

  it('falls back to the latest primary workflow for a settled instance', () => {
    const earlier = workflow('Completed', {
      databaseId: 'earlier',
      createdAt: '2026-08-02T08:00:00Z',
    });
    const auxiliaryWorkflow = workflow('Completed', {
      role: 'auxiliary',
      createdAt: '2026-08-02T09:45:00Z',
    });
    const latest = workflow('Completed', {
      databaseId: 'latest',
      createdAt: '2026-08-02T09:30:00Z',
    });
    expect(pickFocusWorkflow([earlier, latest, auxiliaryWorkflow], WorkflowHealth.Healthy)).toBe(
      latest,
    );
  });
});

describe('focusStepOf', () => {
  it('is the first step that has not completed, in processing order', () => {
    const steps = [step(2, 'Enqueued'), step(0, 'Completed'), step(1, 'Failed')];
    expect(focusStepOf(workflow('Failed', { steps }))?.processingOrder).toBe(1);
  });

  it('is the last step once every step has completed', () => {
    const steps = [step(1, 'Completed'), step(0, 'Completed')];
    expect(focusStepOf(workflow('Completed', { steps }))?.processingOrder).toBe(1);
    expect(focusStepOf(workflow('Completed'))).toBeUndefined();
  });
});

describe('errors', () => {
  it('orders errors newest first and finds the latest across steps', () => {
    const early = error('2026-08-02T09:00:00Z', 'early');
    const late = error('2026-08-02T09:30:00Z', 'late');
    const latest = error('2026-08-02T09:45:00Z', 'latest');
    const steps = [
      step(0, 'Completed', { errorHistory: [early, latest] }),
      step(1, 'Failed', { errorHistory: [late] }),
    ];

    expect(newestFirst([early, latest, late]).map((entry) => entry.message)).toEqual([
      'latest',
      'late',
      'early',
    ]);
    expect(latestErrorOf(workflow('Failed', { steps }))).toBe(latest);
    expect(latestErrorOf(workflow('Failed'))).toBeUndefined();
  });
});
