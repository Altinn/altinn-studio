import { act, renderHook } from '@testing-library/react';
import { useAltinityThreads } from './useAltinityThreads';
import { useChatThreadsQuery } from '../queries/useChatThreadsQuery';
import { useCreateChatThreadMutation } from '../mutations/useCreateChatThreadMutation';
import { useDeleteChatThreadMutation } from '../mutations/useDeleteChatThreadMutation';
import { useChatMessagesQuery } from '../queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from '../mutations/useCreateChatMessageMutation';

jest.mock('../queries/useChatThreadsQuery');
jest.mock('../mutations/useCreateChatThreadMutation');
jest.mock('../mutations/useDeleteChatThreadMutation');
jest.mock('../queries/useChatMessagesQuery');
jest.mock('../mutations/useCreateChatMessageMutation');

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
