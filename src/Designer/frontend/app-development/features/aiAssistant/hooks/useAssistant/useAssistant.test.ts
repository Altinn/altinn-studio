import { act, renderHook } from '@testing-library/react';
import { useAssistant } from './useAssistant';
import type { AssistantThreadState } from '../useAssistantThreads/useAssistantThreads';
import { useAssistantThreads } from '../useAssistantThreads/useAssistantThreads';
import { useAssistantWorkflow } from '../useAssistantWorkflow/useAssistantWorkflow';

jest.mock('../useAssistantThreads/useAssistantThreads');
jest.mock('../useAssistantWorkflow/useAssistantWorkflow');

const mockUseAssistantThreads = useAssistantThreads as jest.MockedFunction<
  typeof useAssistantThreads
>;
const mockUseAssistantWorkflow = useAssistantWorkflow as jest.MockedFunction<
  typeof useAssistantWorkflow
>;

describe('useAssistant', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes thread data and delegates selectThread to the threads hook', () => {
    const threads = createThreadState();

    mockUseAssistantThreads.mockReturnValue(threads);
    mockUseAssistantWorkflow.mockReturnValue({
      connectionStatus: 'connected',
      workflowStatusByThread: {},
      onSubmitMessage: jest.fn(),
      cancelCurrentWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      cancelledMessageContent: null,
      clearCancelledMessageContent: jest.fn(),
      messages: [],
    });

    const { result } = renderUseAssistant();

    act(() => {
      result.current.selectThread(null);
    });

    expect(result.current.chatThreads).toBe(threads.chatThreads);
    expect(result.current.selectedThreadId).toBe(threads.selectedThreadId);
    expect(threads.selectThread).toHaveBeenCalledWith(null);
  });
});

const createThreadState = (): AssistantThreadState => ({
  chatThreads: [],
  selectedThreadId: null,
  chatMessages: [],
  selectThread: jest.fn(),
  createThread: jest.fn().mockResolvedValue('new-thread-id'),
  deleteThread: jest.fn(),
  deleteMessage: jest.fn(),
  createMessage: jest.fn(),
  refreshMessages: jest.fn(),
});

const renderUseAssistant = () => renderHook(() => useAssistant());
