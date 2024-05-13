import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../test/mocks';
import { useUpdateLayoutSetMutation } from './useUpdateLayoutSetMutation';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutSetIdToUpdate = 'oldLayoutSetName';
const newLayoutSetId: string = 'newLayoutSetName';

describe('useUpdateLayoutSetMutation', () => {
  it('Calls updateLayoutSetMutation with correct arguments and payload', async () => {
    const updateLayoutSetResult = renderHookWithMockStore()(() =>
      useUpdateLayoutSetMutation(org, app),
    ).renderHookResult.result;
    await waitFor(() =>
      updateLayoutSetResult.current.mutateAsync({
        layoutSetIdToUpdate,
        newLayoutSetId,
      }),
    );
    expect(updateLayoutSetResult.current.isSuccess).toBe(true);

    expect(queriesMock.updateLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateLayoutSet).toHaveBeenCalledWith(
      org,
      app,
      layoutSetIdToUpdate,
      newLayoutSetId,
    );
  });
});
