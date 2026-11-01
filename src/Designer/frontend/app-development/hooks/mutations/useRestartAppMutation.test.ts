import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import type { RunningApp } from 'app-shared/types/api/RunningApp';
import { renderHookWithProviders } from '../../test/mocks';
import { useRestartAppMutation } from './useRestartAppMutation';

const ready = (environment: string): RunningApp => ({
  environment,
  version: '1',
  buildId: null,
  status: 'ready',
  restartedAt: null,
  canRestart: true,
});

describe('useRestartAppMutation', () => {
  it('restarts the app and shows it as updating in that environment only', async () => {
    const restarted: RunningApp = {
      ...ready('tt02'),
      status: 'updating',
      restartedAt: '2026-10-31T10:42:00+00:00',
    };
    const restartApp = vi.fn().mockResolvedValue(restarted);
    const queryClient = createQueryClientMock();
    queryClient.setQueryData<DeploymentsResponse>([QueryKey.AppDeployments, org, app], {
      pipelineDeploymentList: [],
      runningAppList: [ready('tt02'), ready('production')],
    });

    const { result } = renderHookWithProviders(
      { restartApp },
      queryClient,
    )(() => useRestartAppMutation(org, app)).renderHookResult;
    await result.current.mutateAsync({ environment: 'tt02' });

    expect(restartApp).toHaveBeenCalledWith(org, app, 'tt02');
    await waitFor(() =>
      expect(
        queryClient.getQueryData<DeploymentsResponse>([QueryKey.AppDeployments, org, app])
          ?.runningAppList,
      ).toEqual([restarted, ready('production')]),
    );
  });

  it('refreshes what runs when the restart is refused', async () => {
    const restartApp = vi.fn().mockRejectedValue(new Error('AppUpdating'));
    const queryClient = createQueryClientMock();
    queryClient.setQueryData<DeploymentsResponse>([QueryKey.AppDeployments, org, app], {
      pipelineDeploymentList: [],
      runningAppList: [ready('tt02')],
    });
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHookWithProviders(
      { restartApp },
      queryClient,
    )(() => useRestartAppMutation(org, app)).renderHookResult;
    await expect(result.current.mutateAsync({ environment: 'tt02' })).rejects.toThrow();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppDeployments, org, app],
    });
  });

  it('leaves the list of running apps empty when the backend sent none', async () => {
    const restartApp = vi.fn().mockResolvedValue({ ...ready('tt02'), status: 'updating' });
    const queryClient = createQueryClientMock();
    queryClient.setQueryData<DeploymentsResponse>([QueryKey.AppDeployments, org, app], {
      pipelineDeploymentList: [],
    });

    const { result } = renderHookWithProviders(
      { restartApp },
      queryClient,
    )(() => useRestartAppMutation(org, app)).renderHookResult;
    await result.current.mutateAsync({ environment: 'tt02' });

    expect(
      queryClient.getQueryData<DeploymentsResponse>([QueryKey.AppDeployments, org, app])
        ?.runningAppList,
    ).toEqual([]);
  });
});
