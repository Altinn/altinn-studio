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
  WORKFLOW_HEALTH_KEYS_PER_REQUEST,
} from './useInstancesWorkflowHealthQuery';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  get: jest.fn(),
}));

const env = 'at23';

/** Deterministic, well-formed instance GUIDs: only the last block varies. */
const guidAt = (index: number) => `3a0e0f6e-4b1d-4a2a-9d31-${index.toString().padStart(12, '0')}`;

const keysFrom = (url: string) => [
  ...new URLSearchParams(url.slice(url.indexOf('?'))).getAll('key'),
];

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
          pageSize: WORKFLOW_HEALTH_KEYS_PER_REQUEST,
          totalCount: keysFrom(url).length,
        },
      }) as AxiosResponse,
  );
};

describe('useInstancesWorkflowHealthQuery', () => {
  afterEach(jest.clearAllMocks);

  it('splits the loaded instances into one annotate request per page', async () => {
    respondHealthy();
    const guids = Array.from({ length: 25 }, (_, index) => guidAt(index));

    const { result } = renderHealthQuery(guids);

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(axios.get).toHaveBeenCalledTimes(3);

    const requestedKeyCounts = jest
      .mocked(axios.get)
      .mock.calls.map(([url]) => keysFrom(url as string).length);
    expect(requestedKeyCounts).toEqual([10, 10, 5]);
    expect(Object.keys(result.current.healthByKey)).toHaveLength(25);
  });

  it('fetches only the new page when more instances are loaded', async () => {
    respondHealthy();
    const client = createQueryClientMock();
    const firstPage = Array.from({ length: 10 }, (_, index) => guidAt(index));

    const { result, rerender } = renderHealthQuery(firstPage, client);
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(axios.get).toHaveBeenCalledTimes(1);

    rerender([...firstPage, guidAt(10)]);

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));
    expect(keysFrom(jest.mocked(axios.get).mock.calls[1][0] as string)).toEqual([guidAt(10)]);
    await waitFor(() =>
      expect(result.current.healthByKey[guidAt(10)]).toBe(WorkflowHealth.Healthy),
    );
  });

  it('makes no request when no instances are loaded', () => {
    respondHealthy();
    const { result } = renderHealthQuery([]);

    expect(axios.get).not.toHaveBeenCalled();
    expect(result.current).toEqual({ isUnavailable: false, healthByKey: {}, isPending: false });
  });
});

const renderHealthQuery = (guids: string[], client: QueryClient = createQueryClientMock()) => {
  const { result, rerender } = renderHook(
    (instanceGuids: string[]) => useInstancesWorkflowHealthQuery(org, env, app, instanceGuids),
    {
      initialProps: guids,
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    },
  );
  return { result, rerender };
};
