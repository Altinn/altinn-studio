import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../testing/mocks';
import { waitFor } from '@testing-library/react';
import { useAddLayoutSetMutation } from './useAddLayoutSetMutation';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

// Test data:
const org = 'org';
const app = 'app';
const layoutSet: LayoutSetConfig = {
  id: 'newSet',
  tasks: ['task_2'],
};

describe('useAddLayoutSetMutation', () => {
  it('Calls addLayoutSetMutation with correct arguments and payload', async () => {
    const addLayoutSetResult = renderHookWithMockStore()(() => useAddLayoutSetMutation(org, app))
      .renderHookResult.result;
    addLayoutSetResult.current.mutate(layoutSet);
    await waitFor(() => expect(addLayoutSetResult.current.isSuccess).toBe(true));

    expect(queriesMock.addLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.addLayoutSet).toHaveBeenCalledWith(org, app, layoutSet);
  });
});
