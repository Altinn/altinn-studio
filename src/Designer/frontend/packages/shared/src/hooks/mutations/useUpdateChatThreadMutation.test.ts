import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useUpdateChatThreadMutation } from './useUpdateChatThreadMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const updateArgs = { id: 'thread-1', title: 'Updated title' };

describe('useUpdateChatThreadMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls updateChatThread with the new title', async () => {
    const result = renderHookWithProviders()(() => useUpdateChatThreadMutation()).renderHookResult
      .result;

    result.current.mutate(updateArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.updateChatThread).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateChatThread).toHaveBeenCalledWith(org, app, updateArgs.id, {
      title: updateArgs.title,
    });
  });

  it('Invalidates ChatThreads when updating a thread', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useUpdateChatThreadMutation())
      .renderHookResult.result;

    result.current.mutate(updateArgs);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.ChatThreads, org, app],
    });
  });
});
