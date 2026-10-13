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
  groupSideChains,
  sideChainName,
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
  databaseId: `wf-${overallStatus}-${extra.isHead === false ? 'side' : 'head'}`,
  operationId: 'Process next: Pdf -> Sign',
  idempotencyKey: 'key',
  namespace: 'org/app',
  createdAt: '2026-08-02T09:00:00Z',
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

describe('sideChainName', () => {
  it('names a side chain by what comes after the separator, or by its whole id', () => {
    expect(
      sideChainName(
        workflow('Completed', {
          operationId: 'Process next side-effects: Form -> Verify · MovedToAltinnEvent',
        }),
      ),
    ).toBe('MovedToAltinnEvent');
    expect(sideChainName(workflow('Completed', { operationId: 'send-eformidling' }))).toBe(
      'send-eformidling',
    );
  });
});

describe('groupSideChains', () => {
  const transition = (id: string, target: string, extra: Partial<WorkflowStatus> = {}) =>
    workflow('Completed', {
      databaseId: id,
      operationId: `Process next: ${target}`,
      labels: { processNextTargetId: target },
      ...extra,
    });
  const sideChain = (id: string, target: string, extra: Partial<WorkflowStatus> = {}) =>
    workflow('Completed', {
      databaseId: id,
      operationId: `Process next side-effects: ${target}`,
      labels: { processNextTargetId: target },
      isHead: false,
      ...extra,
    });

  it('files a side chain under the transition it belongs to, wherever it came in the list', () => {
    const groups = groupSideChains([
      transition('t1', 'Form:2'),
      transition('t2', 'Verify:3'),
      sideChain('s1', 'Form:2'),
      sideChain('s2', 'Verify:3'),
    ]);
    expect(groups.map((group) => group.workflow.databaseId)).toEqual(['t1', 't2']);
    expect(groups[0].sideChains.map((chain) => chain.databaseId)).toEqual(['s1']);
    expect(groups[1].sideChains.map((chain) => chain.databaseId)).toEqual(['s2']);
  });

  it('files under the transition itself, not under a later head with the same label', () => {
    const receiver = transition('r1', 'Approval:4', {
      operationId: 'Mailbox receive: Approval · 0',
    });
    const groups = groupSideChains([
      transition('t1', 'Approval:4'),
      receiver,
      sideChain('s1', 'Approval:4'),
    ]);
    expect(groups.map((group) => group.workflow.databaseId)).toEqual(['t1', 'r1']);
    expect(groups[0].sideChains.map((chain) => chain.databaseId)).toEqual(['s1']);
    expect(groups[1].sideChains).toEqual([]);
  });

  it('keeps a side chain in place when its transition is not in the list or it has no label', () => {
    const groups = groupSideChains([
      sideChain('s0', 'Form:2'),
      transition('t1', 'Verify:3'),
      sideChain('s1', 'Verify:3', { labels: undefined }),
    ]);
    expect(groups.map((group) => group.workflow.databaseId)).toEqual(['s0', 't1', 's1']);
    expect(groups.every((group) => group.sideChains.length === 0)).toBe(true);
  });
});

describe('deriveInstanceHealth', () => {
  const retrying = workflow('Requeued', { steps: [step(0, 'Requeued', { retryCount: 1 })] });
  const sideChainFailed = workflow('Failed', { isHead: false });

  it('reads no workflows as no data, never as healthy', () => {
    expect(deriveInstanceHealth([])).toBe(WorkflowHealth.NoData);
  });

  it('ranks a blocked process above everything else', () => {
    expect(deriveInstanceHealth([sideChainFailed, retrying, workflow('Failed')])).toBe(
      WorkflowHealth.Failed,
    );
  });

  it('ranks a visible workflow retrying above lost side effects', () => {
    expect(deriveInstanceHealth([sideChainFailed, retrying])).toBe(WorkflowHealth.Retrying);
  });

  it('reads a retrying side chain as work in flight, not as a stuck process', () => {
    const retryingSideChain = workflow('Requeued', {
      isHead: false,
      steps: [step(0, 'Requeued', { retryCount: 5 })],
    });
    expect(deriveInstanceHealth([retryingSideChain])).toBe(WorkflowHealth.Active);
  });

  it('ranks lost side effects above a workflow waiting on an outcome or a message', () => {
    expect(deriveInstanceHealth([workflow('Waiting'), sideChainFailed])).toBe(
      WorkflowHealth.SideEffectsFailed,
    );
  });

  it('names what a visible workflow waits for, an outcome before a message', () => {
    expect(deriveInstanceHealth([workflow('Held'), workflow('Waiting')])).toBe(
      WorkflowHealth.Waiting,
    );
    expect(deriveInstanceHealth([workflow('Processing'), workflow('Held')])).toBe(
      WorkflowHealth.Held,
    );
    expect(deriveInstanceHealth([workflow('Waiting', { isHead: false })])).toBe(
      WorkflowHealth.Active,
    );
  });

  it('ranks lost side effects above work in flight, and that above settled work', () => {
    expect(deriveInstanceHealth([workflow('Processing'), sideChainFailed])).toBe(
      WorkflowHealth.SideEffectsFailed,
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
    const sideChainFailed = workflow('Failed', { isHead: false });
    const workflows = [olderFailed, sideChainFailed, newerFailed];

    expect(pickFocusWorkflow(workflows, WorkflowHealth.Failed)).toBe(newerFailed);
    expect(pickFocusWorkflow([sideChainFailed], WorkflowHealth.SideEffectsFailed)).toBe(
      sideChainFailed,
    );
  });

  it('prefers a visible workflow over a side chain when both are in flight', () => {
    const sideChain = workflow('Processing', { isHead: false });
    const head = workflow('Enqueued');
    expect(pickFocusWorkflow([sideChain, head], WorkflowHealth.Active)).toBe(head);
  });

  it('falls back to the latest visible workflow for a settled instance', () => {
    const earlier = workflow('Completed', {
      databaseId: 'earlier',
      createdAt: '2026-08-02T08:00:00Z',
    });
    const sideChain = workflow('Completed', { isHead: false, createdAt: '2026-08-02T09:45:00Z' });
    const latest = workflow('Completed', {
      databaseId: 'latest',
      createdAt: '2026-08-02T09:30:00Z',
    });
    expect(pickFocusWorkflow([earlier, latest, sideChain], WorkflowHealth.Healthy)).toBe(latest);
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
