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

  it('exposes thread data and resets workflow on new thread', () => {
    const threads = createThreadState();
    const resetWorkflowStatus = jest.fn();

    mockUseAltinityThreads.mockReturnValue(threads);
    mockUseAltinityWorkflow.mockReturnValue({
      connectionStatus: 'connected',
      workflowStatus: { isActive: false },
      onSubmitMessage: jest.fn(),
      resetWorkflowStatus,
    });

    const { result } = renderUseAltinityAssistant();

    act(() => {
      result.current.createNewThread();
    });

    expect(result.current.chatThreads).toBe(threads.chatThreads);
    expect(result.current.currentSessionId).toBe(threads.currentSessionId);
    expect(threads.createNewThread).toHaveBeenCalledTimes(1);
    expect(resetWorkflowStatus).toHaveBeenCalledTimes(1);
  });
});

const createThreadState = (): AltinityThreadState => ({
  chatThreads: [],
  currentSessionId: null,
  currentSessionIdRef: { current: null },
  setCurrentSession: jest.fn(),
  selectThread: jest.fn(),
  createNewThread: jest.fn(),
  deleteThread: jest.fn(),
  addMessageToThread: jest.fn(),
  upsertAssistantMessage: jest.fn(),
  updateWorkflowStatusMessage: jest.fn(),
});

const renderUseAltinityAssistant = () => renderHook(() => useAltinityAssistant());
