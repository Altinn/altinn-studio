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

jest.mock('app-shared/hooks/useStudioEnvironmentParams');
jest.mock('app-shared/hooks/queries/useChatThreadsQuery');
jest.mock('app-shared/hooks/mutations/useCreateChatThreadMutation');
jest.mock('app-shared/hooks/mutations/useDeleteChatThreadMutation');
jest.mock('app-shared/hooks/queries/useChatMessagesQuery');
jest.mock('app-shared/hooks/mutations/useCreateChatMessageMutation');
jest.mock('app-shared/hooks/mutations/useDeleteChatMessageMutation');

const mockUseStudioEnvironmentParams = useStudioEnvironmentParams as jest.MockedFunction<
  typeof useStudioEnvironmentParams
>;
const mockUseChatThreadsQuery = useChatThreadsQuery as jest.MockedFunction<
  typeof useChatThreadsQuery
>;
const mockUseCreateChatThreadMutation = useCreateChatThreadMutation as jest.MockedFunction<
  typeof useCreateChatThreadMutation
>;
const mockUseDeleteChatThreadMutation = useDeleteChatThreadMutation as jest.MockedFunction<
  typeof useDeleteChatThreadMutation
>;
const mockUseChatMessagesQuery = useChatMessagesQuery as jest.MockedFunction<
  typeof useChatMessagesQuery
>;
const mockUseCreateChatMessageMutation = useCreateChatMessageMutation as jest.MockedFunction<
  typeof useCreateChatMessageMutation
>;
const mockUseDeleteChatMessageMutation = useDeleteChatMessageMutation as jest.MockedFunction<
  typeof useDeleteChatMessageMutation
>;

const threadId = 'session-1';

describe('useAssistantThreads', () => {
  beforeEach(() => {
    mockUseStudioEnvironmentParams.mockReturnValue({ org: 'testOrg', app: 'testApp' });
    mockUseChatThreadsQuery.mockReturnValue({ data: [] } as any);
    mockUseCreateChatThreadMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ id: 'new-thread-id' }),
    } as any);
    mockUseDeleteChatThreadMutation.mockReturnValue({ mutate: jest.fn() } as any);
    mockUseChatMessagesQuery.mockReturnValue({ data: [], isLoading: false } as any);
    mockUseCreateChatMessageMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ id: 'persisted-id' }),
    } as any);
    mockUseDeleteChatMessageMutation.mockReturnValue({ mutateAsync: jest.fn() } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('invalidates the thread messages query on refreshMessages', () => {
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
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
    const createMutateAsync = jest.fn().mockResolvedValue({ id: 'new-thread-id' });
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
    const deleteMessageMutate = jest.fn().mockResolvedValue(undefined);
    mockUseDeleteChatMessageMutation.mockReturnValue({ mutateAsync: deleteMessageMutate } as any);

    const { result } = renderUseAssistantThreads();

    act(() => {
      result.current.deleteMessage(threadId, 'message-1');
    });

    expect(deleteMessageMutate).toHaveBeenCalledWith({ threadId, messageId: 'message-1' });
  });

  it('createMessage forwards user fields and omits assistant fields', async () => {
    const createMessageMutateAsync = jest.fn().mockResolvedValue({ id: 'persisted-id' });
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
    const createMessageMutateAsync = jest.fn().mockResolvedValue({ id: 'persisted-id' });
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

  it('clears current session when deleting active thread succeeds', () => {
    const deleteThreadMutate = jest
      .fn()
      .mockImplementation((_id, options) => options?.onSuccess?.());
    mockUseDeleteChatThreadMutation.mockReturnValue({ mutate: deleteThreadMutate } as any);

    const { result } = renderUseAssistantThreads();

    act(() => {
      result.current.selectThread(threadId);
    });

    act(() => {
      result.current.deleteThread(threadId);
    });

    expect(deleteThreadMutate).toHaveBeenCalledWith(threadId, expect.any(Object));
    expect(result.current.selectedThreadId).toBeNull();
  });
});

const renderUseAssistantThreads = (queryClient: QueryClient = new QueryClient()) =>
  renderHook(() => useAssistantThreads(), {
    wrapper: ({ children }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
