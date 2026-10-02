import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { waitFor } from '@testing-library/react';
import { useDeleteLayoutSetMutation } from './useDeleteLayoutSetMutation';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

// Test data:
const layoutSetToDeleteId = 'oldLayoutSetName';

describe('useDeleteLayoutSetMutation', () => {
  it('Calls deleteLayoutSetMutation with correct arguments and payload', async () => {
    const deleteLayoutSetResult = renderHookWithProviders()(() =>
      useDeleteLayoutSetMutation(org, app),
    ).renderHookResult.result;
    await deleteLayoutSetResult.current.mutateAsync({
      layoutSetIdToUpdate: layoutSetToDeleteId,
    });
    await waitFor(() => expect(deleteLayoutSetResult.current.isSuccess).toBe(true));

    expect(queriesMock.deleteLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteLayoutSet).toHaveBeenCalledWith(org, app, layoutSetToDeleteId);
  });

  it('Invalidates AppValidation on success', async () => {
    const queryClientMock = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(queryClientMock, 'invalidateQueries');
    const deleteLayoutSetResult = renderHookWithProviders(
      {},
      queryClientMock,
    )(() => useDeleteLayoutSetMutation(org, app)).renderHookResult.result;

    await deleteLayoutSetResult.current.mutateAsync({
      layoutSetIdToUpdate: layoutSetToDeleteId,
    });
    await waitFor(() => expect(deleteLayoutSetResult.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.AppValidation, org, app],
    });
  });
});
