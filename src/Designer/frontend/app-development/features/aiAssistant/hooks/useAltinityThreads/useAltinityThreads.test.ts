import { act, renderHook } from '@testing-library/react';
import { useAltinityThreads } from './useAltinityThreads';
import { useThreadStorage } from '../useThreadStorage/useThreadStorage';
import { useChatMessagesQuery } from '../queries/useChatMessagesQuery';
import { useCreateChatMessageMutation } from '../mutations/useCreateChatMessageMutation';

jest.mock('../useThreadStorage/useThreadStorage');
jest.mock('../queries/useChatMessagesQuery');
jest.mock('../mutations/useCreateChatMessageMutation');

const mockUseThreadStorage = useThreadStorage as jest.MockedFunction<typeof useThreadStorage>;
const mockUseChatMessagesQuery = useChatMessagesQuery as jest.MockedFunction<
  typeof useChatMessagesQuery
>;
const mockUseCreateChatMessageMutation = useCreateChatMessageMutation as jest.MockedFunction<
  typeof useCreateChatMessageMutation
>;

const threadId = 'session-1';

describe('useAltinityThreads', () => {
  beforeEach(() => {
    mockUseChatMessagesQuery.mockReturnValue({ data: [], isLoading: false } as any);
    mockUseCreateChatMessageMutation.mockReturnValue({ mutate: jest.fn() } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('updates current session when selecting a thread', () => {
    mockUseThreadStorage.mockReturnValue(createStorageState());

    const { result } = renderUseAltinityThreads();

    act(() => {
      result.current.selectThread(threadId);
    });

    expect(result.current.currentSessionId).toBe(threadId);
    expect(result.current.currentSessionIdRef.current).toBe(threadId);
  });

  it('clears current session when deleting active thread', () => {
    const storageState = createStorageState();
    mockUseThreadStorage.mockReturnValue(storageState);

    const { result } = renderUseAltinityThreads();

    act(() => {
      result.current.selectThread(threadId);
    });

    act(() => {
      result.current.deleteThread(threadId);
    });

    expect(storageState.deleteThread).toHaveBeenCalledWith(threadId);
    expect(result.current.currentSessionId).toBeNull();
  });
});

const createStorageState = (): ReturnType<typeof useThreadStorage> => ({
  threads: [],
  isLoading: false,
  addThread: jest.fn().mockResolvedValue('new-thread-id'),
  updateThread: jest.fn(),
  deleteThread: jest.fn(),
  getThread: jest.fn(),
});

const renderUseAltinityThreads = () => renderHook(() => useAltinityThreads());
