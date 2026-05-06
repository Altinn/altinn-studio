import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@studio/testing/testids';
import { useCreateChatThreadMutation } from './useCreateChatThreadMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { CreateChatThreadPayload } from 'app-shared/types/api';

const payload: CreateChatThreadPayload = { title: 'My new thread' };

describe('useCreateChatThreadMutation', () => {
  afterEach(jest.clearAllMocks);

  it('Calls createChatThread with correct arguments and payload', async () => {
    const result = renderHookWithProviders()(() => useCreateChatThreadMutation()).renderHookResult
      .result;

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.createChatThread).toHaveBeenCalledTimes(1);
    expect(queriesMock.createChatThread).toHaveBeenCalledWith(org, app, payload);
  });

  it('Invalidates ChatThreads when creating a thread', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = jest.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useCreateChatThreadMutation())
      .renderHookResult.result;

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.ChatThreads, org, app],
    });
  });
});
