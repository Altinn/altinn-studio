import { describe, expect, it, vi } from 'vitest';
import { del } from 'app-shared/utils/networking';
import type * as Networking from 'app-shared/utils/networking';
import { waitFor } from '@testing-library/react';
import { useInstanceDeletionMutation } from './useInstanceDeletionMutation';
import { renderHookWithProviders } from '../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { instanceDeletePath } from 'admin/features/apps/utils/apiPaths';

vi.mock('app-shared/utils/networking', async (importOriginal) => ({
  ...(await importOriginal<typeof Networking>()),
  del: vi.fn(),
}));

const org = 'ttd';
const environment = 'tt02';
const app = 'test-app';
const instanceId = '51e58b12-6de1-4d0f-9052-ec2ee9d43adf';

describe('useInstanceDeletionMutation', () => {
  it('deletes the instance and invalidates instance queries on success', async () => {
    vi.mocked(del).mockResolvedValue(undefined);
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(
      () => useInstanceDeletionMutation(org, environment, app, instanceId),
      { queryClient },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(del).toHaveBeenCalledTimes(1);
    expect(del).toHaveBeenCalledWith(instanceDeletePath(org, environment, app, instanceId));
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppInstanceDetails, org, environment, app, instanceId],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppInstances, org, environment, app],
    });
  });

  it('does not invalidate instance queries when deletion fails', async () => {
    vi.mocked(del).mockRejectedValue(new Error('Network error'));
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(
      () => useInstanceDeletionMutation(org, environment, app, instanceId),
      { queryClient },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
