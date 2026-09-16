import type { InfiniteData } from '@tanstack/react-query';
import type { WorkflowCollectionListResponse } from 'admin/features/apps/types/workflows/WorkflowCollection';
import type {
  PersistentItemStatus,
  WorkflowListResponse,
  WorkflowStatus,
} from 'admin/features/apps/types/workflows/WorkflowStatus';
import {
  ACTIVE_WORK_REFETCH_INTERVAL_MS,
  MIN_REFETCH_INTERVAL_MS,
  PROCESSING_REFETCH_INTERVAL_MS,
  hasActiveCollectionPages,
  hasActiveCollections,
  hasActiveWorkflows,
  refetchWhileActive,
  workflowsRefetchInterval,
} from './workflowRefetch';

const workflowPages = (
  ...statusesPerPage: PersistentItemStatus[][]
): InfiniteData<WorkflowListResponse | null> => ({
  pageParams: statusesPerPage.map(() => undefined),
  pages: statusesPerPage.map((statuses) => ({
    data: statuses.map((overallStatus, index) => ({
      databaseId: `workflow-${index}`,
      collectionKey: 'key',
      operationId: 'op',
      idempotencyKey: `idem-${index}`,
      namespace: 'org/app',
      createdAt: '2026-08-02T10:00:00Z',
      overallStatus,
      steps: [],
    })),
    pageSize: 25,
    totalCount: statuses.length,
    nextCursor: null,
  })),
});

const collections = (...active: number[]): WorkflowCollectionListResponse => ({
  data: active.map((count, index) => ({
    key: `key-${index}`,
    namespace: 'org/app',
    createdAt: '2026-08-01T10:00:00Z',
    workflowCounts: { active: count, failedVisible: 0, failedInvisible: 0, total: count },
  })),
  pageSize: 25,
  totalCount: active.length,
  nextCursor: null,
});

const now = new Date('2026-08-02T10:00:00Z').getTime();

const pagesOf = (...workflows: Partial<WorkflowStatus>[]): InfiniteData<WorkflowListResponse> => ({
  pageParams: [undefined],
  pages: [
    {
      data: workflows.map((workflow, index) => ({
        databaseId: `workflow-${index}`,
        collectionKey: 'key',
        operationId: 'op',
        idempotencyKey: `idem-${index}`,
        namespace: 'org/app',
        createdAt: '2026-08-02T10:00:00Z',
        overallStatus: 'Completed',
        steps: [],
        ...workflow,
      })),
      pageSize: 25,
      totalCount: workflows.length,
      nextCursor: null,
    },
  ],
});

describe('workflowsRefetchInterval', () => {
  it('reads a workflow in execution every few seconds', () => {
    expect(workflowsRefetchInterval(pagesOf({ overallStatus: 'Processing' }), now)).toBe(
      PROCESSING_REFETCH_INTERVAL_MS,
    );
    expect(workflowsRefetchInterval(pagesOf({ overallStatus: 'Enqueued' }), now)).toBe(
      PROCESSING_REFETCH_INTERVAL_MS,
    );
  });

  it('reads a parked workflow right after its backoff elapses', () => {
    const inFourSeconds = new Date(now + 4_000).toISOString();
    expect(
      workflowsRefetchInterval(
        pagesOf({ overallStatus: 'Requeued', backoffUntil: inFourSeconds }),
        now,
      ),
    ).toBe(5_000);
  });

  it('caps a long backoff at the usual interval and floors one that is already due', () => {
    const inTenMinutes = new Date(now + 600_000).toISOString();
    const aMinuteAgo = new Date(now - 60_000).toISOString();
    expect(
      workflowsRefetchInterval(
        pagesOf({ overallStatus: 'Waiting', backoffUntil: inTenMinutes }),
        now,
      ),
    ).toBe(ACTIVE_WORK_REFETCH_INTERVAL_MS);
    expect(
      workflowsRefetchInterval(
        pagesOf({ overallStatus: 'Requeued', backoffUntil: aMinuteAgo }),
        now,
      ),
    ).toBe(MIN_REFETCH_INTERVAL_MS);
  });

  it('falls back to the usual interval when a parked workflow carries no backoff', () => {
    expect(workflowsRefetchInterval(pagesOf({ overallStatus: 'Requeued' }), now)).toBe(
      ACTIVE_WORK_REFETCH_INTERVAL_MS,
    );
    expect(workflowsRefetchInterval(pagesOf({ overallStatus: 'Held' }), now)).toBe(
      ACTIVE_WORK_REFETCH_INTERVAL_MS,
    );
  });

  it('takes the soonest interval across the loaded workflows, and none when all are settled', () => {
    const inTenMinutes = new Date(now + 600_000).toISOString();
    expect(
      workflowsRefetchInterval(
        pagesOf(
          { overallStatus: 'Requeued', backoffUntil: inTenMinutes },
          { overallStatus: 'Processing' },
          { overallStatus: 'Failed' },
        ),
        now,
      ),
    ).toBe(PROCESSING_REFETCH_INTERVAL_MS);
    expect(
      workflowsRefetchInterval(
        pagesOf({ overallStatus: 'Failed' }, { overallStatus: 'Completed' }),
        now,
      ),
    ).toBe(false);
    expect(workflowsRefetchInterval(undefined, now)).toBe(false);
  });
});

describe('workflowRefetch', () => {
  it('polls only while something is active', () => {
    expect(refetchWhileActive(true)).toBe(ACTIVE_WORK_REFETCH_INTERVAL_MS);
    expect(refetchWhileActive(false)).toBe(false);
  });

  it.each<PersistentItemStatus>(['Enqueued', 'Processing', 'Requeued', 'Waiting', 'Held'])(
    'treats a %s workflow as work in flight',
    (status) => {
      expect(hasActiveWorkflows(workflowPages(['Completed'], [status]))).toBe(true);
    },
  );

  it.each<PersistentItemStatus>([
    'Completed',
    'Failed',
    'Canceled',
    'DependencyFailed',
    'Abandoned',
  ])('leaves a %s workflow alone', (status) => {
    expect(hasActiveWorkflows(workflowPages([status]))).toBe(false);
  });

  it('reads an empty or missing page as nothing in flight', () => {
    expect(hasActiveWorkflows(undefined)).toBe(false);
    expect(hasActiveWorkflows({ pageParams: [undefined], pages: [null] })).toBe(false);
  });

  it('treats a collection with active work as in flight, and absent counts as settled', () => {
    expect(hasActiveCollections(collections(0, 2))).toBe(true);
    expect(hasActiveCollections(collections(0, 0))).toBe(false);
    expect(hasActiveCollections(null)).toBe(false);
    expect(
      hasActiveCollections({
        ...collections(),
        data: [{ key: 'k', namespace: 'n', createdAt: '' }],
      }),
    ).toBe(false);
  });

  it('looks across every loaded discovery page', () => {
    expect(
      hasActiveCollectionPages({
        pageParams: [undefined, 'c'],
        pages: [collections(0), collections(1)],
      }),
    ).toBe(true);
  });
});
