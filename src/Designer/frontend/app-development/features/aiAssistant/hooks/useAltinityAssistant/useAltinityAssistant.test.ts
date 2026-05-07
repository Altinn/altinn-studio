import { act, renderHook } from '@testing-library/react';
import { useAltinityAssistant } from './useAltinityAssistant';
import type { AltinityThreadState } from '../useAltinityThreads/useAltinityThreads';
import { useAltinityThreads } from '../useAltinityThreads/useAltinityThreads';
import { useAltinityWorkflow } from '../useAltinityWorkflow/useAltinityWorkflow';

jest.mock('../useAltinityThreads/useAltinityThreads');
jest.mock('../useAltinityWorkflow/useAltinityWorkflow');

const mockUseAltinityThreads = useAltinityThreads as jest.MockedFunction<typeof useAltinityThreads>;
const mockUseAltinityWorkflow = useAltinityWorkflow as jest.MockedFunction<
  typeof useAltinityWorkflow
>;

describe('useAltinityAssistant', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exposes thread data and delegates new thread to workflow', () => {
    const threads = createThreadState();
    const clearCurrentSession = jest.fn();

    mockUseAltinityThreads.mockReturnValue(threads);
    mockUseAltinityWorkflow.mockReturnValue({
      connectionStatus: 'connected',
      workflowStatus: { isActive: false },
      onSubmitMessage: jest.fn(),
      clearCurrentSession,
      cancelCurrentWorkflow: jest.fn(),
      cancelledMessageContent: null,
      clearCancelledMessageContent: jest.fn(),
    });

    const { result } = renderUseAltinityAssistant();

    act(() => {
      result.current.clearCurrentSession();
    });

    expect(result.current.chatThreads).toBe(threads.chatThreads);
    expect(result.current.currentSessionId).toBe(threads.currentSessionId);
    expect(clearCurrentSession).toHaveBeenCalledTimes(1);
  });
});

const createThreadState = (): AltinityThreadState => ({
  chatThreads: [],
  currentSessionId: null,
  currentSessionIdRef: { current: null },
  chatMessages: [],
  setCurrentSession: jest.fn(),
  selectThread: jest.fn(),
  createThread: jest.fn().mockResolvedValue('new-thread-id'),
  deleteThread: jest.fn(),
  deleteMessage: jest.fn(),
  createMessage: jest.fn(),
});

const renderUseAltinityAssistant = () => renderHook(() => useAltinityAssistant());
