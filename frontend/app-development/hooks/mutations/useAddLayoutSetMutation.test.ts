import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../test/mocks';
import { act } from '@testing-library/react';
import { useAddLayoutSetMutation } from './useAddLayoutSetMutation';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

// Test data:
const org = 'org';
const app = 'app';
const layoutSetIdToUpdate = 'oldLayoutSetName';
const layoutSet: LayoutSetConfig = {
  id: 'newLayoutSetName',
  tasks: ['task_2'],
};

describe('useAddLayoutSetMutation', () => {
  it('Calls useAddLayoutSetMutation with correct arguments and payload', async () => {
    const addLayoutSetResult = renderHookWithMockStore()(() => useAddLayoutSetMutation(org, app))
      .renderHookResult.result;
    await act(() =>
      addLayoutSetResult.current.mutateAsync({
        layoutSetIdToUpdate: layoutSetIdToUpdate,
        layoutSetConfig: layoutSet,
      }),
    );
    expect(addLayoutSetResult.current.isSuccess).toBe(true);

    expect(queriesMock.addLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.addLayoutSet).toHaveBeenCalledWith(org, app, layoutSetIdToUpdate, layoutSet);
  });
});
