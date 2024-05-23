import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../test/mocks';
import { useUpdateLayoutSetIdMutation } from './useUpdateLayoutSetIdMutation';
import { waitFor } from '@testing-library/react';

// Test data:
const org = 'org';
const app = 'app';
const layoutSetIdToUpdate = 'oldLayoutSetName';
const newLayoutSetId: string = 'newLayoutSetName';

describe('useUpdateLayoutSetIdMutation', () => {
  it('Calls updateLayoutSetIdMutation with correct arguments and payload', async () => {
    const updateLayoutSetResult = renderHookWithMockStore()(() =>
      useUpdateLayoutSetIdMutation(org, app),
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
