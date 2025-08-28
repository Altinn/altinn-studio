import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { waitFor } from '@testing-library/react';
import { useDeleteLayoutSetMutation } from './useDeleteLayoutSetMutation';
import { app, org } from '@studio/testing/testids';

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
});
