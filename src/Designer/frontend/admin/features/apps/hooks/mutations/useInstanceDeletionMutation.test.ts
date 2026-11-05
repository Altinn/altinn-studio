import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { useInstanceDeletionMutation } from './useInstanceDeletionMutation';
import { renderHookWithProviders } from '../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const org = 'ttd';
const environment = 'tt02';
const app = 'test-app';
const instanceId = '51e58b12-6de1-4d0f-9052-ec2ee9d43adf';

describe('useInstanceDeletionMutation', () => {
  it('deletes the instance and invalidates instance queries on success', async () => {
    const deleteAppInstance = vi.fn().mockResolvedValue(undefined);
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(
      () => useInstanceDeletionMutation(org, environment, app, instanceId),
      { queryClient, queries: { deleteAppInstance } },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(deleteAppInstance).toHaveBeenCalledTimes(1);
    expect(deleteAppInstance).toHaveBeenCalledWith(org, environment, app, instanceId);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppInstanceDetails, org, environment, app, instanceId],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppInstances, org, environment, app],
    });
  });

  it('does not invalidate instance queries when deletion fails', async () => {
    const deleteAppInstance = vi.fn().mockRejectedValue(new Error('Network error'));
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(
      () => useInstanceDeletionMutation(org, environment, app, instanceId),
      { queryClient, queries: { deleteAppInstance } },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
