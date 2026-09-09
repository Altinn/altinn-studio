import axios from 'axios';
import { waitFor } from '@testing-library/react';
import { useInstanceDeletionMutation } from './useInstanceDeletionMutation';
import { renderHookWithProviders } from '../../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { instanceDeletePath } from 'admin/features/apps/utils/apiPaths';

jest.mock('axios', () => ({
  ...jest.requireActual('axios'),
  delete: jest.fn(),
}));

const org = 'ttd';
const environment = 'tt02';
const app = 'test-app';
const instanceId = '51e58b12-6de1-4d0f-9052-ec2ee9d43adf';

describe('useInstanceDeletionMutation', () => {
  afterEach(jest.clearAllMocks);

  it('deletes the instance and invalidates instance queries on success', async () => {
    (axios.delete as jest.Mock).mockResolvedValue({});
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(
      () => useInstanceDeletionMutation(org, environment, app, instanceId),
      { queryClient },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(axios.delete).toHaveBeenCalledTimes(1);
    expect(axios.delete).toHaveBeenCalledWith(
      instanceDeletePath(org, environment, app, instanceId),
    );
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppInstanceDetails, org, environment, app, instanceId],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppInstances, org, environment, app],
    });
  });

  it('does not invalidate instance queries when deletion fails', async () => {
    (axios.delete as jest.Mock).mockRejectedValue(new Error('Network error'));
    const queryClient = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHookWithProviders(
      () => useInstanceDeletionMutation(org, environment, app, instanceId),
      { queryClient },
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateQueriesSpy).not.toHaveBeenCalled();
  });
});
