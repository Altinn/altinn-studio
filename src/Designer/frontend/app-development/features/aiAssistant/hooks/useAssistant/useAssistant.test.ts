import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MockedFunction } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAssistant } from './useAssistant';
import type { AssistantThreadState } from '../useAssistantThreads/useAssistantThreads';
import { useAssistantThreads } from '../useAssistantThreads/useAssistantThreads';
import { useAssistantWorkflow } from '../useAssistantWorkflow/useAssistantWorkflow';

vi.mock('../useAssistantThreads/useAssistantThreads');
vi.mock('../useAssistantWorkflow/useAssistantWorkflow');

const mockUseAssistantThreads = useAssistantThreads as MockedFunction<typeof useAssistantThreads>;
const mockUseAssistantWorkflow = useAssistantWorkflow as MockedFunction<
  typeof useAssistantWorkflow
>;

describe('useAssistant', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exposes thread data and delegates selectThread to the threads hook', () => {
    const threads = createThreadState();

    mockUseAssistantThreads.mockReturnValue(threads);
    mockUseAssistantWorkflow.mockReturnValue({
      connectionStatus: 'connected',
      workflowStatusByThread: {},
      onSubmitMessage: vi.fn(),
      cancelCurrentWorkflow: vi.fn(),
      respondToPermission: vi.fn(),
      cancelledMessageContent: null,
      clearCancelledMessageContent: vi.fn(),
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
  selectThread: vi.fn(),
  createThread: vi.fn().mockResolvedValue('new-thread-id'),
  deleteThread: vi.fn(),
  deleteMessage: vi.fn(),
  createMessage: vi.fn(),
  refreshMessages: vi.fn(),
});

const renderUseAssistant = () => renderHook(() => useAssistant());
