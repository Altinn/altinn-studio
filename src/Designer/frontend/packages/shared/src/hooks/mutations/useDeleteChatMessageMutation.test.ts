import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useDeleteChatMessageMutation } from './useDeleteChatMessageMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const threadId = 'thread-1';
const messageId = 'message-1';

describe('useDeleteChatMessageMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls deleteChatMessage with correct arguments', async () => {
    const result = renderHookWithProviders()(() => useDeleteChatMessageMutation()).renderHookResult
      .result;

    result.current.mutate({ threadId, messageId });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.deleteChatMessage).toHaveBeenCalledTimes(1);
    expect(queriesMock.deleteChatMessage).toHaveBeenCalledWith(org, app, threadId, messageId);
  });

  it('Invalidates ChatMessages for the thread when deleting a message', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useDeleteChatMessageMutation())
      .renderHookResult.result;

    result.current.mutate({ threadId, messageId });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.ChatMessages, org, app, threadId],
    });
  });
});
