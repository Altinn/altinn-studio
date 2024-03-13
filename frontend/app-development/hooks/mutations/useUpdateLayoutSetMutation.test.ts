import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithMockStore } from '../../test/mocks';
import { waitFor } from '@testing-library/react';
import { useUpdateLayoutSetMutation } from './useUpdateLayoutSetMutation';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';

// Test data:
const org = 'org';
const app = 'app';
const layoutSet: LayoutSetConfig = {
  id: 'newSet',
  tasks: ['task_2'],
};

describe('useUpdateLayoutSetMutation', () => {
  it('Calls updateLayoutSetMutation with correct arguments and payload', async () => {
    const updateLayoutSetResult = renderHookWithMockStore()(() =>
      useUpdateLayoutSetMutation(org, app),
    ).renderHookResult.result;
    updateLayoutSetResult.current.mutate(layoutSet);
    await waitFor(() => expect(updateLayoutSetResult.current.isSuccess).toBe(true));

    expect(queriesMock.updateLayoutSet).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateLayoutSet).toHaveBeenCalledWith(org, app, layoutSet);
  });
});
