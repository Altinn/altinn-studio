import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../test/mocks';
import { act } from '@testing-library/react';
import { useUpdateLayoutSetMutation } from './useUpdateLayoutSetMutation';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

// Test data:
const org = 'org';
const app = 'app';
const layoutSetIdToUpdate = 'oldLayoutSetName';
const layoutSet: LayoutSetConfig = {
  id: 'newLayoutSetName',
  tasks: ['task_2'],
};

describe('useUpdateLayoutSetMutation', () => {
  it('Calls updateLayoutSetMutation with correct arguments and payload', async () => {
    const updateLayoutSetResult = renderHookWithMockStore()(() =>
      useUpdateLayoutSetMutation(org, app),
    ).renderHookResult.result;
    await act(() =>
      updateLayoutSetResult.current.mutateAsync({
        layoutSetIdToUpdate: layoutSetIdToUpdate,
        layoutSetConfig: layoutSet,
      }),
    );
    expect(updateLayoutSetResult.current.isSuccess).toBe(true);

    expect(queriesMock.updateLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateLayoutSet).toHaveBeenCalledWith(
      org,
      app,
      layoutSetIdToUpdate,
      layoutSet,
    );
  });
});
