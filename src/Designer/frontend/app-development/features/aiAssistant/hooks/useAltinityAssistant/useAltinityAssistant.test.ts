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
    const deselectCurrentThread = jest.fn();

    mockUseAltinityThreads.mockReturnValue(threads);
    mockUseAltinityWorkflow.mockReturnValue({
      connectionStatus: 'connected',
      workflowStatusByThread: {},
      onSubmitMessage: jest.fn(),
      deselectCurrentThread,
      cancelCurrentWorkflow: jest.fn(),
      cancelledMessageContent: null,
      clearCancelledMessageContent: jest.fn(),
      messages: [],
    });

    const { result } = renderUseAltinityAssistant();

    act(() => {
      result.current.deselectCurrentThread();
    });

    expect(result.current.chatThreads).toBe(threads.chatThreads);
    expect(result.current.selectedThreadId).toBe(threads.selectedThreadId);
    expect(deselectCurrentThread).toHaveBeenCalledTimes(1);
  });
});

const createThreadState = (): AltinityThreadState => ({
  chatThreads: [],
  selectedThreadId: null,
  selectedThreadIdRef: { current: null },
  chatMessages: [],
  setSelectedThread: jest.fn(),
  selectThread: jest.fn(),
  createThread: jest.fn().mockResolvedValue('new-thread-id'),
  deleteThread: jest.fn(),
  deleteMessage: jest.fn(),
  createMessage: jest.fn(),
});

const renderUseAltinityAssistant = () => renderHook(() => useAltinityAssistant());
