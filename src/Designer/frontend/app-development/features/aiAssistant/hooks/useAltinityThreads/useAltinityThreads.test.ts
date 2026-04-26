import { act, renderHook } from '@testing-library/react';
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

  it('clears current session when deleting active thread', () => {
    const deleteThreadMutate = jest.fn();
    mockUseDeleteChatThreadMutation.mockReturnValue({ mutate: deleteThreadMutate } as any);

    const { result } = renderUseAltinityThreads();

    act(() => {
      result.current.selectThread(threadId);
    });

    act(() => {
      result.current.deleteThread(threadId);
    });

    expect(deleteThreadMutate).toHaveBeenCalledWith(threadId);
    expect(result.current.currentSessionId).toBeNull();
  });
});

const renderUseAltinityThreads = () => renderHook(() => useAltinityThreads());
