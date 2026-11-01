import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { focusManager } from '@tanstack/react-query';
import { app, org } from '@studio/testing/testids';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';
import type { RunningAppStatus } from 'app-shared/types/api/RunningApp';
import { renderHookWithProviders } from '../../test/mocks';
import { UPDATING_APP_POLL_INTERVAL_MS, useAppDeploymentsQuery } from './useAppDeploymentsQuery';

const deployments = (status: RunningAppStatus): DeploymentsResponse => ({
  pipelineDeploymentList: [],
  runningAppList: [
    {
      environment: 'tt02',
      version: '1',
      buildId: null,
      status,
      restartedAt: null,
      canRestart: true,
    },
  ],
});

describe('useAppDeploymentsQuery', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it('polls while an app is updating, and stops once it is ready', async () => {
    const getDeployments = vi
      .fn()
      .mockResolvedValueOnce(deployments('updating'))
      .mockResolvedValueOnce(deployments('updating'))
      .mockResolvedValue(deployments('ready'));
    await renderAndLoad(getDeployments);

    await advanceTime(UPDATING_APP_POLL_INTERVAL_MS);
    await advanceTime(UPDATING_APP_POLL_INTERVAL_MS);
    await advanceTime(3 * UPDATING_APP_POLL_INTERVAL_MS);

    expect(getDeployments).toHaveBeenCalledTimes(3);
  });

  it('refreshes when the user returns to the page, such as after restarting in another tab', async () => {
    const getDeployments = vi.fn().mockResolvedValue(deployments('ready'));
    await renderAndLoad(getDeployments);

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() => expect(getDeployments).toHaveBeenCalledTimes(2));
  });

  it('does not poll when no app is updating', async () => {
    const getDeployments = vi.fn().mockResolvedValue(deployments('ready'));
    await renderAndLoad(getDeployments);

    await advanceTime(3 * UPDATING_APP_POLL_INTERVAL_MS);

    expect(getDeployments).toHaveBeenCalledTimes(1);
  });
});

async function renderAndLoad(getDeployments: () => Promise<DeploymentsResponse>): Promise<void> {
  const { result } = renderHookWithProviders({ getDeployments })(() =>
    useAppDeploymentsQuery(org, app),
  ).renderHookResult;
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
}

const advanceTime = (milliseconds: number): Promise<void> =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
