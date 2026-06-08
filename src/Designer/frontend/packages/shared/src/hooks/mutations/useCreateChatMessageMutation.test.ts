import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useCreateChatMessageMutation } from './useCreateChatMessageMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { MessageAuthor } from 'app-shared/types/api';
import type { CreateChatMessagePayload } from 'app-shared/types/api';

const threadId = 'thread-1';
const payload: CreateChatMessagePayload = {
  role: MessageAuthor.User,
  content: 'Hello',
  allowAppChanges: false,
};

describe('useCreateChatMessageMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls createChatMessage with correct arguments and payload', async () => {
    const result = renderHookWithProviders()(() => useCreateChatMessageMutation()).renderHookResult
      .result;

    result.current.mutate({ threadId, payload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.createChatMessage).toHaveBeenCalledTimes(1);
    expect(queriesMock.createChatMessage).toHaveBeenCalledWith(org, app, threadId, payload);
  });

  it('Invalidates ChatMessages for the thread when creating a message', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useCreateChatMessageMutation())
      .renderHookResult.result;

    result.current.mutate({ threadId, payload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.ChatMessages, org, app, threadId],
    });
  });
});
