import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../test/mocks';
import { waitFor } from '@testing-library/react';
import { useDeleteLayoutSetMutation } from './useDeleteLayoutSetMutation';

// Test data:
const org = 'org';
const app = 'app';
const layoutSetToDeleteId = 'oldLayoutSetName';

describe('useDeleteLayoutSetMutation', () => {
  it('Calls deleteLayoutSetMutation with correct arguments and payload', async () => {
    const deleteLayoutSetResult = renderHookWithMockStore()(() =>
      useDeleteLayoutSetMutation(org, app),
    ).renderHookResult.result;
    await deleteLayoutSetResult.current.mutateAsync({
      layoutSetIdToUpdate: layoutSetToDeleteId,
    });
    await waitFor(() => expect(deleteLayoutSetResult.current.isSuccess).toBe(true));

    expect(queriesMock.deleteLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteLayoutSet).toHaveBeenCalledWith(org, app, layoutSetToDeleteId);
  });
});
