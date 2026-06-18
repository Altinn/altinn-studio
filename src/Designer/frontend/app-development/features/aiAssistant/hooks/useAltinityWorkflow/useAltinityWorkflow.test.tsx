import { act } from '@testing-library/react';
import { QueryClient, type UseQueryResult } from '@tanstack/react-query';
import type {
  AgentResponse,
  AssistantMessageEvent,
  UserMessage,
  WorkflowEvent,
  WorkflowRequest,
} from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import type { AltinityThreadState } from '../useAltinityThreads/useAltinityThreads';
import { useAltinityWorkflow } from './useAltinityWorkflow';
import { useAltinityWebSocket } from '../useAltinityWebSocket/useAltinityWebSocket';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { renderHookWithProviders } from '../../../../test/mocks';
import type { CurrentBranchInfo } from 'app-shared/types/api/BranchTypes';

jest.mock('../useAltinityWebSocket/useAltinityWebSocket');
jest.mock('app-shared/hooks/queries/useCurrentBranchQuery');

const mockUseAltinityWebSocket = useAltinityWebSocket as jest.MockedFunction<
  typeof useAltinityWebSocket
>;
const mockUseCurrentBranchQuery = useCurrentBranchQuery as jest.MockedFunction<
  typeof useCurrentBranchQuery
>;

describe('useAltinityWorkflow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips workflow when message content is empty', async () => {
    const threads = createThreadState();
    const startWorkflow = jest.fn();

    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow,
      cancelWorkflow: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAltinityWorkflow(threads);

    const message: UserMessage = {
      role: MessageAuthor.User,
      content: '',
      createdAt: new Date().toISOString(),
      allowAppChanges: false,
    };

    await act(async () => {
      await result.current.onSubmitMessage(message);
    });

    expect(startWorkflow).not.toHaveBeenCalled();
    expect(threads.createMessage).not.toHaveBeenCalled();
  });

  it('persists assistant message using thread ID, not backend session ID', async () => {
    const threads = createThreadState({ selectedThreadId: 'database-thread-id' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAltinityWorkflow(threads);

    const assistantMessageEvent: AssistantMessageEvent = {
      type: 'assistant_message',
      session_id: 'database-thread-id',
      data: { content: 'Assistant reply' },
    };

    await act(async () => {
      capturedOnAgentMessage!(assistantMessageEvent);
    });

    expect(threads.createMessage).toHaveBeenCalledWith(
      'database-thread-id',
      expect.objectContaining({ role: MessageAuthor.Assistant, content: 'Assistant reply' }),
    );
  });

  it('persists assistant message to the submission thread even when the user has switched to another thread', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result, rerender } = renderUseAltinityWorkflow(threads);

    const userMessage: UserMessage = {
      role: MessageAuthor.User,
      content: 'Hello from thread A',
      createdAt: new Date().toISOString(),
      allowAppChanges: false,
    };

    await act(async () => {
      await result.current.onSubmitMessage(userMessage);
    });

    threads.selectedThreadId = 'thread-b';
    rerender();

    const assistantMessageEvent: AssistantMessageEvent = {
      type: 'assistant_message',
      session_id: 'thread-a',
      data: { content: 'Assistant reply for thread A' },
    };

    await act(async () => {
      capturedOnAgentMessage!(assistantMessageEvent);
    });

    expect(threads.createMessage).toHaveBeenCalledWith(
      'thread-a',
      expect.objectContaining({
        role: MessageAuthor.Assistant,
        content: 'Assistant reply for thread A',
      }),
    );
    expect(threads.createMessage).not.toHaveBeenCalledWith('thread-b', expect.anything());
  });

  it('routes workflow status updates by event session_id, leaving other threads untouched', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result, rerender } = renderUseAltinityWorkflow(threads);

    const userMessage: UserMessage = {
      role: MessageAuthor.User,
      content: 'Hello',
      createdAt: new Date().toISOString(),
      allowAppChanges: false,
    };

    await act(async () => {
      await result.current.onSubmitMessage(userMessage);
    });

    threads.selectedThreadId = 'thread-b';
    rerender();

    const statusMessageForThreadA = 'Halfway done with thread A';
    await act(async () => {
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-a',
        data: { message: statusMessageForThreadA },
      });
    });

    expect(result.current.workflowStatusByThread['thread-a']?.message).toBe(
      statusMessageForThreadA,
    );
    expect(result.current.workflowStatusByThread['thread-a']?.isActive).toBe(true);
    expect(result.current.workflowStatusByThread['thread-b']).toBeUndefined();
  });

  it('drops workflow events that have no session_id', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAltinityWorkflow(threads);

    await act(async () => {
      await result.current.onSubmitMessage({
        role: MessageAuthor.User,
        content: 'Hello',
        createdAt: new Date().toISOString(),
        allowAppChanges: false,
      });
    });

    const messageBefore = result.current.workflowStatusByThread['thread-a']?.message;

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'workflow_status',
        data: { message: 'Stray update without session_id' },
      } as WorkflowEvent);
    });

    expect(result.current.workflowStatusByThread['thread-a']?.message).toBe(messageBefore);
  });

  it('creates thread and starts workflow for new session', async () => {
    const threads = createThreadState();
    const startWorkflow = jest.fn<Promise<AgentResponse>, [WorkflowRequest]>().mockResolvedValue({
      accepted: false,
      session_id: 'backend-session',
      message: 'Rejected',
    });

    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow,
      cancelWorkflow: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAltinityWorkflow(threads);

    const message: UserMessage = {
      role: MessageAuthor.User,
      content: 'Hello',
      createdAt: new Date().toISOString(),
      allowAppChanges: false,
    };

    await act(async () => {
      await result.current.onSubmitMessage(message);
    });

    expect(threads.createThread).toHaveBeenCalledWith('Hello');
    expect(threads.selectThread).toHaveBeenCalledWith('new-thread-id');
    expect(threads.createMessage).toHaveBeenCalledWith(
      'new-thread-id',
      expect.objectContaining({ role: MessageAuthor.User, content: 'Hello' }),
    );
    expect(startWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: 'new-thread-id',
        goal: 'Hello',
        org: 'testOrg',
        app: 'testApp',
        branch: 'feature-branch',
        allow_app_changes: false,
      }),
    );
  });

  it('deletes latest user message on abort when no assistant response has been received', async () => {
    const threads = createThreadState({
      selectedThreadId: 'thread-1',
      chatMessages: [
        {
          id: 'message-1',
          role: MessageAuthor.User,
          content: 'Please do this',
          createdAt: new Date().toISOString(),
          allowAppChanges: false,
        },
      ],
    });
    const cancelWorkflow = jest.fn();

    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow,
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAltinityWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    expect(threads.deleteMessage).toHaveBeenCalledWith('thread-1', 'message-1');
    expect(cancelWorkflow).toHaveBeenCalledWith('thread-1');
  });

  it('does not delete message on abort when assistant has already responded', async () => {
    const threads = createThreadState({
      selectedThreadId: 'thread-1',
      chatMessages: [
        {
          id: 'message-1',
          role: MessageAuthor.User,
          content: 'Please do this',
          createdAt: new Date().toISOString(),
          allowAppChanges: false,
        },
        {
          id: 'message-2',
          role: MessageAuthor.Assistant,
          content: 'Done',
          createdAt: new Date().toISOString(),
          filesChanged: [],
        },
      ],
    });
    const cancelWorkflow = jest.fn();

    mockUseAltinityWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow,
      registerSession: jest.fn().mockResolvedValue(undefined),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAltinityWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    expect(threads.deleteMessage).not.toHaveBeenCalled();
    expect(cancelWorkflow).toHaveBeenCalledWith('thread-1');
  });
});

const createThreadState = (overrides: Partial<AltinityThreadState> = {}): AltinityThreadState => ({
  chatThreads: [],
  selectedThreadId: null,
  chatMessages: [],
  selectThread: jest.fn(),
  createThread: jest.fn().mockResolvedValue('new-thread-id'),
  deleteThread: jest.fn(),
  deleteMessage: jest.fn(),
  createMessage: jest.fn(),
  ...overrides,
});

const renderUseAltinityWorkflow = (threads: AltinityThreadState) => {
  const queryClient = new QueryClient();
  return renderHookWithProviders({}, queryClient)(() => useAltinityWorkflow(threads))
    .renderHookResult;
};

const createMockCurrentBranchInfo = (
  overrides?: Partial<CurrentBranchInfo>,
): CurrentBranchInfo => ({
  branchName: 'feature-branch',
  commitSha: 'abc123def456',
  isTracking: true,
  remoteName: 'origin',
  ...overrides,
});
