import { act, renderHook } from '@testing-library/react';
import { MessageAuthor } from '@studio/assistant';
import type { AssistantMessage, UserMessage } from '@studio/assistant';
import { useAltinityThreads } from './useAltinityThreads';
import { useChatThreadsQuery } from 'app-shared/hooks/queries/useChatThreadsQuery';
import { useCreateChatThreadMutation } from 'app-shared/hooks/mutations/useCreateChatThreadMutation';
import { useDeleteChatThreadMutation } from 'app-shared/hooks/mutations/useDeleteChatThreadMutation';
import { useChatMessagesQuery } from 'app-shared/hooks/queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from 'app-shared/hooks/mutations/useCreateChatMessageMutation';
import { useDeleteChatMessageMutation } from 'app-shared/hooks/mutations/useDeleteChatMessageMutation';

jest.mock('app-shared/hooks/queries/useChatThreadsQuery');
jest.mock('app-shared/hooks/mutations/useCreateChatThreadMutation');
jest.mock('app-shared/hooks/mutations/useDeleteChatThreadMutation');
jest.mock('app-shared/hooks/queries/useChatMessagesQuery');
jest.mock('app-shared/hooks/mutations/useCreateChatMessageMutation');
jest.mock('app-shared/hooks/mutations/useDeleteChatMessageMutation');

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

describe('useAltinityThreads', () => {
  beforeEach(() => {
    mockUseChatThreadsQuery.mockReturnValue({ data: [] } as any);
    mockUseCreateChatThreadMutation.mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({ id: 'new-thread-id' }),
    } as any);
    mockUseDeleteChatThreadMutation.mockReturnValue({ mutate: jest.fn() } as any);
    mockUseChatMessagesQuery.mockReturnValue({ data: [], isLoading: false } as any);
    mockUseCreateChatMessageMutation.mockReturnValue({ mutate: jest.fn() } as any);
    mockUseDeleteChatMessageMutation.mockReturnValue({ mutate: jest.fn() } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates current session when selecting a thread', () => {
    const { result } = renderUseAltinityThreads();

    act(() => {
      result.current.selectThread(threadId);
    });

    expect(result.current.currentSessionId).toBe(threadId);
    expect(result.current.currentSessionIdRef.current).toBe(threadId);
  });

  it('returns the new thread id from createThread', async () => {
    const createMutateAsync = jest.fn().mockResolvedValue({ id: 'new-thread-id' });
    mockUseCreateChatThreadMutation.mockReturnValue({ mutateAsync: createMutateAsync } as any);

    const { result } = renderUseAltinityThreads();

    let createdId: string | undefined;
    await act(async () => {
      createdId = await result.current.createThread('My title');
    });

    expect(createMutateAsync).toHaveBeenCalledWith({ title: 'My title' });
    expect(createdId).toBe('new-thread-id');
  });

  it('forwards messageId to deleteMessage mutation', () => {
    const deleteMessageMutate = jest.fn();
    mockUseDeleteChatMessageMutation.mockReturnValue({ mutate: deleteMessageMutate } as any);

    const { result } = renderUseAltinityThreads();

    act(() => {
      result.current.deleteMessage(threadId, 'message-1');
    });

    expect(deleteMessageMutate).toHaveBeenCalledWith({ threadId, messageId: 'message-1' });
  });

  it('createMessage forwards user fields and omits assistant fields', () => {
    const createMessageMutate = jest.fn();
    mockUseCreateChatMessageMutation.mockReturnValue({ mutate: createMessageMutate } as any);

    const userMessage: UserMessage = {
      role: MessageAuthor.User,
      content: 'Hello',
      createdAt: '2025-01-01T00:00:00Z',
      allowAppChanges: true,
      attachments: [{ name: 'file-a.pdf' }, { name: 'file-b.png' }],
    };

    const { result } = renderUseAltinityThreads();

    act(() => {
      result.current.createMessage(threadId, userMessage);
    });

    expect(createMessageMutate).toHaveBeenCalledWith({
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

  it('createMessage forwards assistant fields and omits user fields', () => {
    const createMessageMutate = jest.fn();
    mockUseCreateChatMessageMutation.mockReturnValue({ mutate: createMessageMutate } as any);

    const assistantMessage: AssistantMessage = {
      role: MessageAuthor.Assistant,
      content: 'Reply',
      createdAt: '2025-01-01T00:00:00Z',
      filesChanged: ['src/a.ts'],
      sources: [{ tool: 'search', title: 'Doc' }],
    };

    const { result } = renderUseAltinityThreads();

    act(() => {
      result.current.createMessage(threadId, assistantMessage);
    });

    expect(createMessageMutate).toHaveBeenCalledWith({
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

    const { result } = renderUseAltinityThreads();

    act(() => {
      result.current.selectThread(threadId);
    });

    act(() => {
      result.current.deleteThread(threadId);
    });

    expect(deleteThreadMutate).toHaveBeenCalledWith(threadId, expect.any(Object));
    expect(result.current.currentSessionId).toBeNull();
  });
});

const renderUseAltinityThreads = () => renderHook(() => useAltinityThreads());
