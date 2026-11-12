import { describe, expect, it, vi } from 'vitest';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@designer/testing/testids';
import { useCreateChatThreadMutation } from './useCreateChatThreadMutation';
import { waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ChatThread, CreateChatThreadPayload } from 'app-shared/types/api';

const payload: CreateChatThreadPayload = { title: 'My new thread' };

describe('useCreateChatThreadMutation', () => {
  it('Calls createChatThread with correct arguments and payload', async () => {
    const result = renderHookWithProviders()(() => useCreateChatThreadMutation()).renderHookResult
      .result;

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queriesMock.createChatThread).toHaveBeenCalledTimes(1);
    expect(queriesMock.createChatThread).toHaveBeenCalledWith(org, app, payload);
  });

  it('Puts the created thread first in the cached thread list', async () => {
    const existingThread: ChatThread = createThread('existing-thread');
    const createdThread: ChatThread = createThread('created-thread');
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.ChatThreads, org, app], [existingThread]);
    const result = renderHookWithProviders(
      { createChatThread: vi.fn().mockResolvedValue(createdThread) },
      client,
    )(() => useCreateChatThreadMutation()).renderHookResult.result;

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData([QueryKey.ChatThreads, org, app])).toEqual([
      createdThread,
      existingThread,
    ]);
  });

  it('Invalidates ChatThreads when creating a thread', async () => {
    const client = createQueryClientMock();
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useCreateChatThreadMutation())
      .renderHookResult.result;

    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.ChatThreads, org, app],
    });
  });
});

const createThread = (id: string): ChatThread => ({
  id,
  title: 'Tråd',
  org,
  app,
  createdBy: 'testUser',
  createdAt: '2026-01-01T00:00:00Z',
});
