import { describe, expect, it, vi } from 'vitest';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@designer/testing/testids';
import { useCreateChatThreadMutation } from './useCreateChatThreadMutation';
import { act, waitFor } from '@testing-library/react';
import { useChatThreadsQuery } from '../queries/useChatThreadsQuery';
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

  it('Lists the created thread first while the thread list is fetched again', async () => {
    const existingThread: ChatThread = createThread('existing-thread');
    const createdThread: ChatThread = createThread('created-thread');
    let answerRefetch: (threads: ChatThread[]) => void = () => {};
    const getChatThreads = vi
      .fn()
      .mockResolvedValueOnce([existingThread])
      .mockImplementationOnce(
        () => new Promise<ChatThread[]>((resolve) => (answerRefetch = resolve)),
      );
    const result = renderHookWithProviders(
      { getChatThreads, createChatThread: vi.fn().mockResolvedValue(createdThread) },
      createQueryClientMock(),
    )(() => ({
      threads: useChatThreadsQuery(),
      createThread: useCreateChatThreadMutation(),
    })).renderHookResult.result;
    await waitFor(() => expect(result.current.threads.data).toEqual([existingThread]));

    await act(() => result.current.createThread.mutateAsync(payload));

    await waitFor(() =>
      expect(result.current.threads.data).toEqual([createdThread, existingThread]),
    );
    expect(getChatThreads).toHaveBeenCalledTimes(2);
    expect(result.current.threads.isFetching).toBe(true);
    act(() => answerRefetch([createdThread, existingThread]));
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
