import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useDeleteChatThreadMutation } from './useDeleteChatThreadMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const threadId = 'thread-1';

describe('useDeleteChatThreadMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls deleteChatThread with correct arguments', async () => {
    const result = renderHookWithProviders()(() => useDeleteChatThreadMutation()).renderHookResult
      .result;

    result.current.mutate(threadId);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.deleteChatThread).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteChatThread).toHaveBeenCalledWith(org, app, threadId);
  });

  it('Invalidates ChatThreads when deleting a thread', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useDeleteChatThreadMutation())
      .renderHookResult.result;

    result.current.mutate(threadId);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.ChatThreads, org, app],
    });
  });
});
