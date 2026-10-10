import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org } from '@studio/testing/testids';
import { WorkflowHealth } from 'admin/features/apps/utils/workflowHealth';
import {
  useInstancesWorkflowHealthQuery,
  WORKFLOW_HEALTH_MAX_KEYS_PER_REQUEST,
} from './useInstancesWorkflowHealthQuery';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
}));

const env = 'at23';

/** Deterministic, well-formed instance GUIDs: only the last block varies. */
const guidAt = (index: number) => `3a0e0f6e-4b1d-4a2a-9d31-${index.toString().padStart(12, '0')}`;

/** One page of instance GUIDs, numbered from `from` so no two pages share a key. */
const pageOf = (size: number, from: number) =>
  Array.from({ length: size }, (_, index) => guidAt(from + index));

const keysFrom = (url: string) => [
  ...new URLSearchParams(url.slice(url.indexOf('?'))).getAll('key'),
];

const requestedKeySets = () =>
  jest
    .mocked(axios.get)
    .mock.calls.map(([url]) => keysFrom(url as string))
    .map((keys) => keys.join(','));

const respondHealthy = () => {
  jest.mocked(axios.get).mockImplementation(
    async (url: string) =>
      ({
        status: 200,
        data: {
          data: keysFrom(url).map((key) => ({
            key,
            namespace: `${org}/${app}`,
            createdAt: '2026-08-01T10:00:00Z',
            workflowCounts: { active: 0, failedVisible: 0, failedInvisible: 0, total: 1 },
          })),
          pageSize: WORKFLOW_HEALTH_MAX_KEYS_PER_REQUEST,
          totalCount: keysFrom(url).length,
        },
      }) as AxiosResponse,
  );
};

const hasSettled = (pendingKeys: Set<string>) => pendingKeys.size === 0;

describe('useInstancesWorkflowHealthQuery', () => {
  afterEach(jest.clearAllMocks);

  it('annotates one request per loaded instance page', async () => {
    respondHealthy();
    const pages = [pageOf(10, 0), pageOf(10, 10), pageOf(5, 20)];

    const { result } = renderHealthQuery(pages);

    await waitFor(() => expect(hasSettled(result.current.pendingKeys)).toBe(true));
    expect(requestedKeySets()).toEqual(pages.map((page) => page.join(',')));
    expect(Object.keys(result.current.healthByKey)).toHaveLength(25);
  });

  it('splits a page larger than the per-request cap without exceeding it', async () => {
    respondHealthy();
    const oversizedPage = pageOf(WORKFLOW_HEALTH_MAX_KEYS_PER_REQUEST + 3, 0);

    const { result } = renderHealthQuery([oversizedPage]);

    await waitFor(() => expect(hasSettled(result.current.pendingKeys)).toBe(true));
    const requestedKeyCounts = jest
      .mocked(axios.get)
      .mock.calls.map(([url]) => keysFrom(url as string).length);
    expect(requestedKeyCounts).toEqual([WORKFLOW_HEALTH_MAX_KEYS_PER_REQUEST, 3]);
  });

  it('fetches only the new page when more instances are loaded', async () => {
    respondHealthy();
    const client = createQueryClientMock();
    const firstPage = pageOf(10, 0);

    const { result, rerender } = renderHealthQuery([firstPage], client);
    await waitFor(() => expect(hasSettled(result.current.pendingKeys)).toBe(true));
    expect(axios.get).toHaveBeenCalledTimes(1);

    rerender([firstPage, [guidAt(10)]]);

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(keysFrom(jest.mocked(axios.get).mock.calls[1][0] as string)).toEqual([guidAt(10)]);
    await waitFor(() =>
      expect(result.current.healthByKey[guidAt(10)]).toBe(WorkflowHealth.Healthy),
    );
  });

  it('does not re-key the later pages when an earlier page is shorter than the rest', async () => {
    respondHealthy();
    const client = createQueryClientMock();
    // A short first page is what a filtered or partly deleted result set looks like. Slicing the
    // accumulated list would shift every chunk boundary behind it, refetching answered keys.
    const shortFirstPage = pageOf(3, 0);
    const fullSecondPage = pageOf(10, 3);
    const thirdPage = pageOf(4, 13);

    const { result, rerender } = renderHealthQuery([shortFirstPage], client);
    await waitFor(() => expect(hasSettled(result.current.pendingKeys)).toBe(true));

    rerender([shortFirstPage, fullSecondPage]);
    await waitFor(() => expect(hasSettled(result.current.pendingKeys)).toBe(true));
    expect(axios.get).toHaveBeenCalledTimes(2);

    rerender([shortFirstPage, fullSecondPage, thirdPage]);
    await waitFor(() => expect(hasSettled(result.current.pendingKeys)).toBe(true));

    expect(axios.get).toHaveBeenCalledTimes(3);
    expect(requestedKeySets()).toEqual(
      [shortFirstPage, fullSecondPage, thirdPage].map((page) => page.join(',')),
    );
    expect(Object.keys(result.current.healthByKey)).toHaveLength(17);
  });

  it('makes no request when no instances are loaded', () => {
    respondHealthy();
    const { result } = renderHealthQuery([]);

    expect(axios.get).not.toHaveBeenCalled();
    expect(result.current).toEqual({ healthByKey: {}, pendingKeys: new Set() });
  });
});

const renderHealthQuery = (
  guidPages: string[][],
  client: QueryClient = createQueryClientMock(),
) => {
  const { result, rerender } = renderHook(
    (instanceGuidPages: string[][]) =>
      useInstancesWorkflowHealthQuery(org, env, app, instanceGuidPages),
    {
      initialProps: guidPages,
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
  return { result, rerender };
};
