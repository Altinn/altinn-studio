import type {
  PersistentItemStatus,
  WorkflowErrorEntry,
  WorkflowStatus,
  WorkflowStepStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import { WorkflowHealth } from './workflowHealth';
import {
  RETRYING_ATTEMPT_THRESHOLD,
  deriveInstanceHealth,
  failedAttemptCount,
  focusStepOf,
  isWorkflowRetrying,
  latestErrorOf,
  newestFirst,
  pickFocusWorkflow,
} from './workflowTriage';

const now = new Date('2026-08-02T10:00:00Z').getTime();
const minutesAhead = (minutes: number) => new Date(now + minutes * 60_000).toISOString();

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
  it('reads a requeued workflow as retrying once a step has failed enough times', () => {
    const steps = [step(0, 'Requeued', { retryCount: RETRYING_ATTEMPT_THRESHOLD })];
    expect(isWorkflowRetrying(workflow('Requeued', { steps }), now)).toBe(true);
    expect(
      isWorkflowRetrying(
        workflow('Requeued', {
          steps: [step(0, 'Requeued', { retryCount: RETRYING_ATTEMPT_THRESHOLD - 1 })],
        }),
        now,
      ),
    ).toBe(false);
  });

  it('reads a long backoff as retrying even after few attempts', () => {
    const steps = [step(0, 'Requeued', { retryCount: 1 })];
    expect(
      isWorkflowRetrying(workflow('Requeued', { steps, backoffUntil: minutesAhead(10) }), now),
    ).toBe(true);
    expect(
      isWorkflowRetrying(workflow('Requeued', { steps, backoffUntil: minutesAhead(1) }), now),
    ).toBe(false);
  });

  it('never reads a waiting workflow as retrying: a deferral is a successful attempt', () => {
    const steps = [step(0, 'Waiting', { retryCount: 9 })];
    expect(
      isWorkflowRetrying(workflow('Waiting', { steps, backoffUntil: minutesAhead(30) }), now),
    ).toBe(false);
  });
});

describe('deriveInstanceHealth', () => {
  const retrying = workflow('Requeued', { steps: [step(0, 'Requeued', { retryCount: 5 })] });
  const sideChainFailed = workflow('Failed', { isHead: false });

  it('reads no workflows as no data, never as healthy', () => {
    expect(deriveInstanceHealth([], now)).toBe(WorkflowHealth.NoData);
  });

  it('ranks a blocked process above everything else', () => {
    expect(deriveInstanceHealth([sideChainFailed, retrying, workflow('Failed')], now)).toBe(
      WorkflowHealth.Failed,
    );
  });

  it('ranks a visible workflow that keeps retrying above lost side effects', () => {
    expect(deriveInstanceHealth([sideChainFailed, retrying], now)).toBe(WorkflowHealth.Retrying);
  });

  it('reads a retrying side chain as work in flight, not as a stuck process', () => {
    const retryingSideChain = workflow('Requeued', {
      isHead: false,
      steps: [step(0, 'Requeued', { retryCount: 5 })],
    });
    expect(deriveInstanceHealth([retryingSideChain], now)).toBe(WorkflowHealth.Active);
  });

  it('ranks lost side effects above work in flight, and that above settled work', () => {
    expect(deriveInstanceHealth([workflow('Processing'), sideChainFailed], now)).toBe(
      WorkflowHealth.SideEffectsFailed,
    );
    expect(deriveInstanceHealth([workflow('Completed'), workflow('Processing')], now)).toBe(
      WorkflowHealth.Active,
    );
    expect(deriveInstanceHealth([workflow('Completed'), workflow('Abandoned')], now)).toBe(
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

    expect(pickFocusWorkflow(workflows, WorkflowHealth.Failed, now)).toBe(newerFailed);
    expect(pickFocusWorkflow([sideChainFailed], WorkflowHealth.SideEffectsFailed, now)).toBe(
      sideChainFailed,
    );
  });

  it('prefers a visible workflow over a side chain when both are in flight', () => {
    const sideChain = workflow('Processing', { isHead: false });
    const head = workflow('Enqueued');
    expect(pickFocusWorkflow([sideChain, head], WorkflowHealth.Active, now)).toBe(head);
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
    expect(pickFocusWorkflow([earlier, latest, sideChain], WorkflowHealth.Healthy, now)).toBe(
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
