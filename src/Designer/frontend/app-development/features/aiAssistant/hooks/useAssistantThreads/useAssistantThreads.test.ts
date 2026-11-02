import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { createElement } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { MessageAuthor } from '@studio/assistant';
import type { AssistantMessage, UserMessage } from '@studio/assistant';
import { useAssistantThreads } from './useAssistantThreads';
import { useChatThreadsQuery } from 'app-shared/hooks/queries/useChatThreadsQuery';
import { useCreateChatThreadMutation } from 'app-shared/hooks/mutations/useCreateChatThreadMutation';
import { useDeleteChatThreadMutation } from 'app-shared/hooks/mutations/useDeleteChatThreadMutation';
import { useChatMessagesQuery } from 'app-shared/hooks/queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from 'app-shared/hooks/mutations/useCreateChatMessageMutation';
import { useDeleteChatMessageMutation } from 'app-shared/hooks/mutations/useDeleteChatMessageMutation';

vi.mock('app-shared/hooks/useStudioEnvironmentParams');
vi.mock('app-shared/hooks/queries/useChatThreadsQuery');
vi.mock('app-shared/hooks/mutations/useCreateChatThreadMutation');
vi.mock('app-shared/hooks/mutations/useDeleteChatThreadMutation');
vi.mock('app-shared/hooks/queries/useChatMessagesQuery');
vi.mock('app-shared/hooks/mutations/useCreateChatMessageMutation');
vi.mock('app-shared/hooks/mutations/useDeleteChatMessageMutation');

const mockUseStudioEnvironmentParams = useStudioEnvironmentParams as MockedFunction<
  typeof useStudioEnvironmentParams
>;
const mockUseChatThreadsQuery = useChatThreadsQuery as MockedFunction<typeof useChatThreadsQuery>;
const mockUseCreateChatThreadMutation = useCreateChatThreadMutation as MockedFunction<
  typeof useCreateChatThreadMutation
>;
const mockUseDeleteChatThreadMutation = useDeleteChatThreadMutation as MockedFunction<
  typeof useDeleteChatThreadMutation
>;
const mockUseChatMessagesQuery = useChatMessagesQuery as MockedFunction<
  typeof useChatMessagesQuery
>;
const mockUseCreateChatMessageMutation = useCreateChatMessageMutation as MockedFunction<
  typeof useCreateChatMessageMutation
>;
const mockUseDeleteChatMessageMutation = useDeleteChatMessageMutation as MockedFunction<
  typeof useDeleteChatMessageMutation
>;

const threadId = 'session-1';

describe('useAssistantThreads', () => {
  beforeEach(() => {
    mockUseStudioEnvironmentParams.mockReturnValue({ org: 'testOrg', app: 'testApp' });
    mockUseChatThreadsQuery.mockReturnValue({ data: [] } as any);
    mockUseCreateChatThreadMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'new-thread-id' }),
    } as any);
    mockUseDeleteChatThreadMutation.mockReturnValue({ mutate: vi.fn() } as any);
    mockUseChatMessagesQuery.mockReturnValue({ data: [], isLoading: false } as any);
    mockUseCreateChatMessageMutation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: 'persisted-id' }),
    } as any);
    mockUseDeleteChatMessageMutation.mockReturnValue({ mutateAsync: vi.fn() } as any);
  });

  it('invalidates the thread messages query on refreshMessages', () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderUseAssistantThreads(queryClient);

    act(() => {
      result.current.refreshMessages(threadId);
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ChatMessages', 'testOrg', 'testApp', threadId],
    });
  });

  it('updates current session when selecting a thread', () => {
    const { result } = renderUseAssistantThreads();

    act(() => {
      result.current.selectThread(threadId);
    });

    expect(result.current.selectedThreadId).toBe(threadId);
  });

  it('returns the new thread id from createThread', async () => {
    const createMutateAsync = vi.fn().mockResolvedValue({ id: 'new-thread-id' });
    mockUseCreateChatThreadMutation.mockReturnValue({ mutateAsync: createMutateAsync } as any);

    const { result } = renderUseAssistantThreads();

    let createdId: string | undefined;
    await act(async () => {
      createdId = await result.current.createThread('My title');
    });

    expect(createMutateAsync).toHaveBeenCalledWith({ title: 'My title' });
    expect(createdId).toBe('new-thread-id');
  });

  it('forwards messageId to deleteMessage mutation', () => {
    const deleteMessageMutate = vi.fn().mockResolvedValue(undefined);
    mockUseDeleteChatMessageMutation.mockReturnValue({ mutateAsync: deleteMessageMutate } as any);

    const { result } = renderUseAssistantThreads();

    act(() => {
      result.current.deleteMessage(threadId, 'message-1');
    });

    expect(deleteMessageMutate).toHaveBeenCalledWith({ threadId, messageId: 'message-1' });
  });

  it('createMessage forwards user fields and omits assistant fields', async () => {
    const createMessageMutateAsync = vi.fn().mockResolvedValue({ id: 'persisted-id' });
    mockUseCreateChatMessageMutation.mockReturnValue({
      mutateAsync: createMessageMutateAsync,
    } as any);

    const userMessage: UserMessage = {
      role: MessageAuthor.User,
      content: 'Hello',
      createdAt: '2025-01-01T00:00:00Z',
      allowAppChanges: true,
      attachments: [{ name: 'file-a.pdf' }, { name: 'file-b.png' }],
    };

    const { result } = renderUseAssistantThreads();

    await act(async () => {
      await result.current.createMessage(threadId, userMessage);
    });

    expect(createMessageMutateAsync).toHaveBeenCalledWith({
      threadId,
      payload: {
        role: MessageAuthor.User,
        content: 'Hello',
        allowAppChanges: true,
        attachmentFileNames: ['file-a.pdf', 'file-b.png'],
        filesChanged: undefined,
        sources: undefined,
      },
    });
  });

  it('createMessage forwards assistant fields and omits user fields', async () => {
    const createMessageMutateAsync = vi.fn().mockResolvedValue({ id: 'persisted-id' });
    mockUseCreateChatMessageMutation.mockReturnValue({
      mutateAsync: createMessageMutateAsync,
    } as any);

    const assistantMessage: AssistantMessage = {
      role: MessageAuthor.Assistant,
      content: 'Reply',
      createdAt: '2025-01-01T00:00:00Z',
      filesChanged: ['src/a.ts'],
      sources: [{ tool: 'search', title: 'Doc' }],
    };

    const { result } = renderUseAssistantThreads();

    await act(async () => {
      await result.current.createMessage(threadId, assistantMessage);
    });

    expect(createMessageMutateAsync).toHaveBeenCalledWith({
      threadId,
      payload: {
        role: MessageAuthor.Assistant,
        content: 'Reply',
        allowAppChanges: undefined,
        attachmentFileNames: undefined,
        filesChanged: ['src/a.ts'],
        sources: [{ tool: 'search', title: 'Doc' }],
      },
    });
  });

  it('opens the next thread when deleting the open thread succeeds', () => {
    mockDeleteSucceeds();
    mockUseChatThreadsQuery.mockReturnValue({ data: threeThreads } as any);
    const { result } = renderUseAssistantThreads();

    act(() => result.current.selectThread('thread-b'));
    act(() => result.current.deleteThread('thread-b'));

    expect(result.current.selectedThreadId).toBe('thread-c');
  });

  it('opens the previous thread when deleting the open last thread succeeds', () => {
    mockDeleteSucceeds();
    mockUseChatThreadsQuery.mockReturnValue({ data: threeThreads } as any);
    const { result } = renderUseAssistantThreads();

    act(() => result.current.selectThread('thread-c'));
    act(() => result.current.deleteThread('thread-c'));

    expect(result.current.selectedThreadId).toBe('thread-b');
  });

  it('clears the open thread when deleting the only thread succeeds', () => {
    const deleteThreadMutate = mockDeleteSucceeds();
    mockUseChatThreadsQuery.mockReturnValue({ data: [threeThreads[0]] } as any);
    const { result } = renderUseAssistantThreads();

    act(() => result.current.selectThread('thread-a'));
    act(() => result.current.deleteThread('thread-a'));

    expect(deleteThreadMutate).toHaveBeenCalledWith('thread-a', expect.any(Object));
    expect(result.current.selectedThreadId).toBeNull();
  });

  it('keeps the open thread when deleting another thread succeeds', () => {
    mockDeleteSucceeds();
    mockUseChatThreadsQuery.mockReturnValue({ data: threeThreads } as any);
    const { result } = renderUseAssistantThreads();

    act(() => result.current.selectThread('thread-a'));
    act(() => result.current.deleteThread('thread-b'));

    expect(result.current.selectedThreadId).toBe('thread-a');
  });
});

const threeThreads = ['thread-a', 'thread-b', 'thread-c'].map((id) => ({
  id,
  title: id,
  createdAt: '2026-01-01T00:00:00Z',
}));

const mockDeleteSucceeds = () => {
  const deleteThreadMutate = vi.fn().mockImplementation((_id, options) => options?.onSuccess?.());
  mockUseDeleteChatThreadMutation.mockReturnValue({ mutate: deleteThreadMutate } as any);
  return deleteThreadMutate;
};

const renderUseAssistantThreads = (queryClient: QueryClient = new QueryClient()) =>
  renderHook(() => useAssistantThreads(), {
    wrapper: ({ children }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
