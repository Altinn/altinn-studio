import { describe, expect, it, vi } from 'vitest';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { renderHookWithProviders } from 'app-development/test/mocks';
import { app, org } from '@designer/testing/testids';
import { useCreateChatMessageMutation } from './useCreateChatMessageMutation';
import { useChatMessagesQuery } from '../queries/useChatMessagesQuery';
import { act, waitFor } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { MessageAuthor } from 'app-shared/types/api';
import type { ChatMessage, CreateChatMessagePayload } from 'app-shared/types/api';

const threadId = 'thread-1';
const payload: CreateChatMessagePayload = {
  role: MessageAuthor.User,
  content: 'Hello',
  allowAppChanges: false,
};

describe('useCreateChatMessageMutation', () => {
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
    const invalidateQueriesSpy = vi.spyOn(client, 'invalidateQueries');
    const result = renderHookWithProviders({}, client)(() => useCreateChatMessageMutation())
      .renderHookResult.result;

    result.current.mutate({ threadId, payload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [QueryKey.ChatMessages, org, app, threadId],
    });
  });

  it('Gets the messages again when the first fetch read the thread before the message was saved', async () => {
    const savedMessage: ChatMessage = {
      id: 'message-1',
      threadId,
      createdAt: '2026-11-12T10:00:00Z',
      role: MessageAuthor.User,
      content: 'Hello',
    };
    const answerSavedByDesigner: ChatMessage = {
      id: 'answer-1',
      threadId,
      createdAt: '2026-11-12T10:00:05Z',
      role: MessageAuthor.Assistant,
      content: 'Svar',
    };
    let answerFirstFetch: (messages: ChatMessage[]) => void = () => {};
    const getChatMessages = vi
      .fn()
      .mockImplementationOnce(
        () => new Promise<ChatMessage[]>((resolve) => (answerFirstFetch = resolve)),
      )
      .mockResolvedValue([savedMessage, answerSavedByDesigner]);
    const createChatMessage = vi.fn().mockResolvedValue(savedMessage);
    const result = renderHookWithProviders(
      { getChatMessages, createChatMessage },
      createQueryClientMock(),
    )(() => ({
      messages: useChatMessagesQuery(threadId),
      createMessage: useCreateChatMessageMutation(),
    })).renderHookResult.result;

    await waitFor(() => expect(getChatMessages).toHaveBeenCalledTimes(1));
    await act(() => result.current.createMessage.mutateAsync({ threadId, payload }));
    act(() => answerFirstFetch([]));

    await waitFor(() =>
      expect(result.current.messages.data?.map((message) => message.id)).toEqual([
        'message-1',
        'answer-1',
      ]),
    );
    expect(getChatMessages).toHaveBeenCalledTimes(2);
  });

  it('Does not add the saved message again when the cache already has it', async () => {
    const savedMessage: ChatMessage = {
      id: 'message-1',
      threadId,
      createdAt: '2026-11-12T10:00:00Z',
      role: MessageAuthor.User,
      content: 'Hello',
    };
    const client = createQueryClientMock();
    client.setQueryData([QueryKey.ChatMessages, org, app, threadId], [savedMessage]);
    const result = renderHookWithProviders(
      { createChatMessage: vi.fn().mockResolvedValue(savedMessage) },
      client,
    )(() => useCreateChatMessageMutation()).renderHookResult.result;

    result.current.mutate({ threadId, payload });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(client.getQueryData([QueryKey.ChatMessages, org, app, threadId])).toEqual([
      savedMessage,
    ]);
  });
});
