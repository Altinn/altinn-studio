import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from '../../test/mocks';
import { useUpdateLayoutSetIdMutation } from './useUpdateLayoutSetIdMutation';
import { waitFor } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';

// Test data:
const layoutSetIdToUpdate = 'oldLayoutSetName';
const newLayoutSetId: string = 'newLayoutSetName';

describe('useUpdateLayoutSetIdMutation', () => {
  it('Calls updateLayoutSetIdMutation with correct arguments and payload', async () => {
    const updateLayoutSetIdResult = renderHookWithProviders()(() =>
      useUpdateLayoutSetIdMutation(org, app),
    ).renderHookResult.result;
    await waitFor(() =>
      updateLayoutSetIdResult.current.mutateAsync({
        layoutSetIdToUpdate,
        newLayoutSetId,
      }),
    );
    expect(updateLayoutSetIdResult.current.isSuccess).toBe(true);

    expect(queriesMock.updateLayoutSetId).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateLayoutSetId).toHaveBeenCalledWith(
      org,
      app,
      layoutSetIdToUpdate,
      newLayoutSetId,
    );
  });
});
