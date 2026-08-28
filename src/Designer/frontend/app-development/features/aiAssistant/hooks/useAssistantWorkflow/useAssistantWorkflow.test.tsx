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
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { AssistantThreadState } from '../useAssistantThreads/useAssistantThreads';
import { useAssistantWorkflow } from './useAssistantWorkflow';
import { useAssistantWebSocket } from '../useAssistantWebSocket/useAssistantWebSocket';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { renderHookWithProviders } from '../../../../test/mocks';
import type { CurrentBranchInfo } from 'app-shared/types/api/BranchTypes';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

jest.mock('../useAssistantWebSocket/useAssistantWebSocket');
jest.mock('app-shared/hooks/queries/useCurrentBranchQuery');

const mockUseAssistantWebSocket = useAssistantWebSocket as jest.MockedFunction<
  typeof useAssistantWebSocket
>;
const mockUseCurrentBranchQuery = useCurrentBranchQuery as jest.MockedFunction<
  typeof useCurrentBranchQuery
>;

describe('useAssistantWorkflow', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('skips workflow when message content is empty', async () => {
    const threads = createThreadState();
    const startWorkflow = jest.fn();

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow,
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

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

  it('adopts an in-flight workflow when status events arrive for a run this tab did not start', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    // No onSubmitMessage in this tab — the run was started elsewhere (another
    // tab, or before a remount). The live events must still show up.
    await act(async () => {
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-a',
        data: { message: 'Skanner repo', tool_use_id: 'tool-1' },
      });
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-a',
        data: { message: 'Leser layout-filer', tool_use_id: 'tool-2' },
      });
    });

    expect(result.current.workflowStatusByThread['thread-a']?.isActive).toBe(true);
    expect(result.current.workflowStatusByThread['thread-a']?.message).toBe('Leser layout-filer');
    expect(result.current.workflowStatusByThread['thread-a']?.steps).toHaveLength(2);
    // The adopting tab must fetch the initiator's user message right away
    // (not first at completion) — and only once per run.
    expect(threads.refreshMessages).toHaveBeenCalledWith('thread-a');
    expect(threads.refreshMessages).toHaveBeenCalledTimes(1);
  });

  it('anchors adopted trail timers at the actual run start via elapsed_ms', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    const elapsedMsAtFirstReceivedEvent = 6000;
    await act(async () => {
      capturedOnAgentMessage!({
        type: 'status',
        session_id: 'thread-a',
        data: { message: 'Skanner repo', elapsed_ms: elapsedMsAtFirstReceivedEvent },
      });
    });

    const steps = result.current.workflowStatusByThread['thread-a']?.steps;
    expect(steps?.[0].offsetMs).toBeGreaterThanOrEqual(elapsedMsAtFirstReceivedEvent);
  });

  it('re-anchors the trail clock for a new run on the same thread', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    // Controlled clock: the second run must start after the post-terminal
    // adoption grace window, like a real follow-up request does.
    let fakeNowMs = 500_000;
    const nowSpy = jest.spyOn(performance, 'now').mockImplementation(() => fakeNowMs);

    const { result } = renderUseAssistantWorkflow(threads);

    // First run, adopted three minutes in, then completed.
    await act(async () => {
      capturedOnAgentMessage!({
        type: 'status',
        session_id: 'thread-a',
        data: { message: 'Skanner repo', elapsed_ms: 180_000 },
      });
      capturedOnAgentMessage!({
        type: 'assistant_message',
        session_id: 'thread-a',
        data: { content: 'Svar', traceId: 'trace-run-1', persistedMessageId: 'msg-1' },
      });
    });

    // A minute later another tab starts a second run on the same thread —
    // its timers must NOT continue from the first run's start.
    fakeNowMs += 60_000;
    await act(async () => {
      capturedOnAgentMessage!({
        type: 'status',
        session_id: 'thread-a',
        data: { message: 'Skanner repo igjen', elapsed_ms: 1_000 },
      });
    });

    const steps = result.current.workflowStatusByThread['thread-a']?.steps;
    expect(steps?.[0].offsetMs).toBe(1_000);
    nowSpy.mockRestore();
  });

  it('dismisses the permission prompt when it is resolved in another tab', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    // This tab adopted the run and shows the prompt, but the user answers
    // it in ANOTHER tab — the broker then broadcasts the resolution.
    await act(async () => {
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-a',
        data: { message: 'Endrer fil' },
      });
      capturedOnAgentMessage!({
        type: 'permission_request',
        session_id: 'thread-a',
        data: { request_id: 'req-1', message: 'edit_file: Side1.json' },
      });
    });

    expect(result.current.workflowStatusByThread['thread-a']?.permissionRequest).toBeDefined();

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'permission_request',
        session_id: 'thread-a',
        data: { request_id: 'req-1', resolved: true, granted: true },
      });
    });

    expect(result.current.workflowStatusByThread['thread-a']?.permissionRequest).toBeUndefined();
  });

  it('does not re-adopt a workflow from status events trailing a terminal event', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    // A cancelled run's terminal event, followed by a status event the agent
    // had already emitted before it noticed the cancellation. The straggler
    // must not resurrect the workflow — no completion would ever follow it.
    await act(async () => {
      capturedOnAgentMessage!({
        type: 'error',
        session_id: 'thread-a',
        data: { status: 'cancelled', done: true },
      });
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-a',
        data: { message: 'Straggler etter kansellering' },
      });
    });

    expect(result.current.workflowStatusByThread['thread-a']?.isActive).toBe(false);
  });

  it('renders a server-persisted message without persisting a client-side copy', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'assistant_message',
        session_id: 'thread-a',
        data: {
          content: 'Svar',
          mode: 'chat',
          traceId: 'trace-1',
          persistedMessageId: 'server-message-id',
        },
      });
    });

    expect(threads.refreshMessages).toHaveBeenCalledWith('thread-a');
    expect(threads.createMessage).not.toHaveBeenCalled();
  });

  it('persists a duplicated assistant_message event only once', async () => {
    const threads = createThreadState({
      selectedThreadId: 'thread-a',
      createMessage: jest.fn().mockResolvedValue({ id: 'persisted-message-id' }),
    });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

    // The same event delivered twice — a stale second connection or HMR
    // leftovers replay the exact payload, traceId included.
    const duplicatedEvent: AssistantMessageEvent = {
      type: 'assistant_message',
      session_id: 'thread-a',
      data: { content: 'Svar', traceId: 'trace-1', mode: 'chat' },
    };

    await act(async () => {
      capturedOnAgentMessage!(duplicatedEvent);
      capturedOnAgentMessage!(duplicatedEvent);
    });

    expect(threads.createMessage).toHaveBeenCalledTimes(1);
  });

  it('keeps the workflow active when the cancel request fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const threads = createThreadState({
      selectedThreadId: 'thread-a',
      chatMessages: [
        {
          id: 'msg-1',
          role: MessageAuthor.User,
          content: 'Legg til et felt',
          createdAt: '2026-01-01T00:00:00Z',
          allowAppChanges: true,
        },
      ],
      deleteMessage: jest.fn().mockResolvedValue(undefined),
    });

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn().mockRejectedValue(new Error('Hub disconnected')),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    // The agent never got the cancel, so the run is still going.
    expect(result.current.workflowStatusByThread['thread-a']?.isActive).toBe(true);
    consoleErrorSpy.mockRestore();
  });

  it('dedupes a redelivered assistant_message that has an eventId but no traceId', async () => {
    const threads = createThreadState({
      selectedThreadId: 'thread-a',
      createMessage: jest.fn().mockResolvedValue({ id: 'persisted-message-id' }),
    });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

    // Langfuse off, so the answer carries no traceId — eventId still identifies it.
    const duplicatedEvent: AssistantMessageEvent = {
      type: 'assistant_message',
      session_id: 'thread-a',
      data: { content: 'Svar', eventId: 'event-1', mode: 'chat' },
    };

    await act(async () => {
      capturedOnAgentMessage!(duplicatedEvent);
      capturedOnAgentMessage!(duplicatedEvent);
    });

    expect(threads.createMessage).toHaveBeenCalledTimes(1);
  });

  it('retries a redelivered assistant_message when the first persist failed', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const threads = createThreadState({
      selectedThreadId: 'thread-a',
      createMessage: jest
        .fn()
        .mockRejectedValueOnce(new Error('Persist failed'))
        .mockResolvedValue({ id: 'persisted-message-id' }),
    });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

    const event: AssistantMessageEvent = {
      type: 'assistant_message',
      session_id: 'thread-a',
      data: { content: 'Svar', traceId: 'trace-retry', mode: 'chat' },
    };

    await act(async () => {
      capturedOnAgentMessage!(event);
    });
    await act(async () => {
      capturedOnAgentMessage!(event);
    });

    expect(threads.createMessage).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });

  it('evicts the oldest dedupe keys so late duplicates of old runs are reprocessed', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

    const dedupeCapacity = 200;
    const sendAssistantMessage = (traceId: string) =>
      capturedOnAgentMessage!({
        type: 'assistant_message',
        session_id: 'thread-a',
        data: { content: 'Svar', traceId, persistedMessageId: `msg-${traceId}` },
      });

    await act(async () => {
      for (let index = 0; index <= dedupeCapacity; index++) {
        sendAssistantMessage(`trace-${index}`);
      }
    });
    expect(threads.refreshMessages).toHaveBeenCalledTimes(dedupeCapacity + 1);

    // trace-0 was evicted from the bounded set — a late duplicate is
    // processed again instead of leaking memory forever.
    await act(async () => {
      sendAssistantMessage('trace-0');
    });
    expect(threads.refreshMessages).toHaveBeenCalledTimes(dedupeCapacity + 2);
  });

  it('marks the workflow inactive on a terminal status event', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-a',
        data: { message: 'Skanner repo' },
      });
      capturedOnAgentMessage!({
        type: 'status',
        session_id: 'thread-a',
        data: { done: true },
      });
    });

    expect(result.current.workflowStatusByThread['thread-a']?.isActive).toBe(false);
  });

  it('persists assistant message using thread ID, not backend session ID', async () => {
    const threads = createThreadState({ selectedThreadId: 'database-thread-id' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

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
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result, rerender } = renderUseAssistantWorkflow(threads);

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
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result, rerender } = renderUseAssistantWorkflow(threads);

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

  it('upgrades a placeholder trail step in place by tool_use_id even when later steps exist', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    const userMessage: UserMessage = {
      role: MessageAuthor.User,
      content: 'Hello',
      createdAt: new Date().toISOString(),
      allowAppChanges: false,
    };

    await act(async () => {
      await result.current.onSubmitMessage(userMessage);
    });

    // Batched tool calls: two placeholders stream in, THEN the first one's
    // landed message arrives. The upgrade must find the row by id even
    // though it is no longer the last step.
    const sendStatus = (message: string, toolUseId: string) =>
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-a',
        data: { message, tool_use_id: toolUseId },
      });

    await act(async () => {
      sendStatus('Henter kunnskap', 'tool-skill-1');
      sendStatus('Skanner repo', 'tool-scan-1');
      sendStatus('Henter kunnskap om altinn-planning', 'tool-skill-1');
    });

    const steps = result.current.workflowStatusByThread['thread-a']?.steps ?? [];
    const messages = steps.map((step) => step.message);
    expect(messages).toContain('Henter kunnskap om altinn-planning');
    expect(messages).toContain('Skanner repo');
    expect(messages).not.toContain('Henter kunnskap');
  });

  it('drops workflow events that have no session_id', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

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

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow,
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

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

  it('stores a permission request on the active thread status and clears it when the user responds', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });
    const respondToPermission = jest.fn().mockResolvedValue(undefined);

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      respondToPermission,
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.onSubmitMessage({
        role: MessageAuthor.User,
        content: 'Legg til en ny side',
        createdAt: new Date().toISOString(),
        allowAppChanges: false,
      });
    });

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'permission_request',
        session_id: 'thread-a',
        data: { request_id: 'req-1', message: 'write_file: App/ui/Side1.json' },
      });
    });

    expect(result.current.workflowStatusByThread['thread-a']?.permissionRequest).toEqual({
      requestId: 'req-1',
      message: 'write_file: App/ui/Side1.json',
    });

    await act(async () => {
      await result.current.respondToPermission('req-1', true);
    });

    expect(respondToPermission).toHaveBeenCalledWith('thread-a', 'req-1', true);
    expect(result.current.workflowStatusByThread['thread-a']?.permissionRequest).toBeUndefined();
  });

  it('ignores permission requests for threads without an active workflow', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'permission_request',
        session_id: 'thread-a',
        data: { request_id: 'req-1', message: 'write_file: App/ui/Side1.json' },
      });
    });

    expect(result.current.workflowStatusByThread['thread-a']).toBeUndefined();
  });

  it('clears the prompt once when the user responds twice to the same request', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });
    const respondToPermission = jest.fn().mockResolvedValue(undefined);

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      respondToPermission,
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.onSubmitMessage({
        role: MessageAuthor.User,
        content: 'Legg til en ny side',
        createdAt: new Date().toISOString(),
        allowAppChanges: false,
      });
    });

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'permission_request',
        session_id: 'thread-a',
        data: { request_id: 'req-1', message: 'write_file: App/ui/Side1.json' },
      });
    });

    // Both calls see the request in the same render (e.g. a double-click);
    // the second clear must find it already gone and leave state untouched.
    await act(async () => {
      await Promise.all([
        result.current.respondToPermission('req-1', true),
        result.current.respondToPermission('req-1', true),
      ]);
    });

    expect(result.current.workflowStatusByThread['thread-a']?.permissionRequest).toBeUndefined();
    expect(result.current.workflowStatusByThread['thread-a']?.isActive).toBe(true);
  });

  it('keeps the permission prompt when sending the response fails', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });
    const respondToPermission = jest.fn().mockRejectedValue(new Error('Hub disconnected'));

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn().mockResolvedValue({ accepted: true, session_id: 'thread-a' }),
      cancelWorkflow: jest.fn(),
      respondToPermission,
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.onSubmitMessage({
        role: MessageAuthor.User,
        content: 'Legg til en ny side',
        createdAt: new Date().toISOString(),
        allowAppChanges: false,
      });
    });

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'permission_request',
        session_id: 'thread-a',
        data: { request_id: 'req-1', message: 'write_file: App/ui/Side1.json' },
      });
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    await act(async () => {
      await result.current.respondToPermission('req-1', true);
    });
    consoleError.mockRestore();

    expect(respondToPermission).toHaveBeenCalledWith('thread-a', 'req-1', true);
    expect(result.current.workflowStatusByThread['thread-a']?.permissionRequest).toEqual({
      requestId: 'req-1',
      message: 'write_file: App/ui/Side1.json',
    });
  });

  it('shows the rejection reason and suggestions when the workflow is rejected', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'error',
        session_id: 'thread-a',
        data: { status: 'rejected', message: 'Målet ble avvist', suggestions: ['Prøv A'] },
      });
    });

    expect(threads.createMessage).toHaveBeenCalledWith(
      'thread-a',
      expect.objectContaining({
        role: MessageAuthor.Assistant,
        content:
          `${textMock('ai_assistant.request_rejected_heading')}\n\nMålet ble avvist\n\n` +
          `${textMock('ai_assistant.suggestions_label')}\nPrøv A`,
      }),
    );
  });

  it('shows the generic failure text for errors that are not rejections', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'error',
        session_id: 'thread-a',
        data: { status: 'failed', message: 'boom' },
      });
    });

    expect(threads.createMessage).toHaveBeenCalledWith(
      'thread-a',
      expect.objectContaining({
        role: MessageAuthor.Assistant,
        content:
          'Beklager, noe gikk galt under behandlingen av forespørselen din. Vennligst prøv igjen.',
      }),
    );
  });

  it('does not create a message for cancelled workflows', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'error',
        session_id: 'thread-a',
        data: { status: 'cancelled' },
      });
    });

    expect(threads.createMessage).not.toHaveBeenCalled();
    // The cancelling tab deleted the aborted user message — every tab must
    // refetch the thread so the deleted message disappears everywhere.
    expect(threads.refreshMessages).toHaveBeenCalledWith('thread-a');
  });

  it('does not send a permission response for an unknown request id', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-a' });
    const respondToPermission = jest.fn();

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission,
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.respondToPermission('stale-request-id', true);
    });

    expect(respondToPermission).not.toHaveBeenCalled();
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

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow,
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    expect(threads.deleteMessage).toHaveBeenCalledWith('thread-1', 'message-1');
    expect(cancelWorkflow).toHaveBeenCalledWith('thread-1');
  });

  it('registers the session on this connection before cancelling', async () => {
    const threads = createThreadState({ selectedThreadId: 'thread-1' });
    const callOrder: string[] = [];
    const registerSession = jest.fn(async () => {
      callOrder.push('registerSession');
    });
    const cancelWorkflow = jest.fn(async () => {
      callOrder.push('cancelWorkflow');
    });

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow,
      respondToPermission: jest.fn(),
      registerSession,
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    // A tab that adopted the run (or reloaded mid-run) has no session on its
    // hub connection — cancel must (re)register first or the hub rejects it.
    expect(registerSession).toHaveBeenCalledWith('testOrg', 'testApp', 'thread-1');
    expect(callOrder).toEqual(['registerSession', 'cancelWorkflow']);
  });

  it('still cancels the workflow when deleting the pending message fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const threads = createThreadState({
      selectedThreadId: 'thread-1',
      deleteMessage: jest.fn().mockRejectedValue(new Error('delete failed')),
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

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow,
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    expect(cancelWorkflow).toHaveBeenCalledWith('thread-1');
    // The message was not deleted, so its content must not be restored to the composer.
    expect(result.current.cancelledMessageContent).toBeNull();
    consoleErrorSpy.mockRestore();
  });

  it('puts the message back in the thread when session registration fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const threads = createThreadState({
      selectedThreadId: 'thread-1',
      deleteMessage: jest.fn().mockResolvedValue(undefined),
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

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow,
      respondToPermission: jest.fn(),
      registerSession: jest.fn().mockRejectedValue(new Error('hub unavailable')),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    // Registration failed, so the cancel never went out and the run continues.
    expect(cancelWorkflow).not.toHaveBeenCalled();
    expect(threads.createMessage).toHaveBeenCalledWith(
      'thread-1',
      expect.objectContaining({ role: MessageAuthor.User, content: 'Please do this' }),
    );
    consoleErrorSpy.mockRestore();
  });

  it('keeps the prompt in the composer when restoring it to the thread also fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const threads = createThreadState({
      selectedThreadId: 'thread-1',
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      createMessage: jest.fn().mockRejectedValue(new Error('thread unavailable')),
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

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn().mockRejectedValue(new Error('agents unreachable')),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    // Last resort: the composer holds the only copy the user has left.
    expect(result.current.cancelledMessageContent).toBe('Please do this');
    consoleErrorSpy.mockRestore();
  });

  it('puts the message back in the thread when the cancel request fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const threads = createThreadState({
      selectedThreadId: 'thread-1',
      deleteMessage: jest.fn().mockResolvedValue(undefined),
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

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn().mockRejectedValue(new Error('agents unreachable')),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    // The run continues, so the prompt belongs in the thread, not the composer.
    expect(threads.createMessage).toHaveBeenCalledWith(
      'thread-1',
      expect.objectContaining({ role: MessageAuthor.User, content: 'Please do this' }),
    );
    expect(result.current.cancelledMessageContent).toBeNull();
    consoleErrorSpy.mockRestore();
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

    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow,
      respondToPermission: jest.fn(),
      registerSession: jest.fn().mockResolvedValue(undefined),
      onAgentMessage: jest.fn(),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    expect(threads.deleteMessage).not.toHaveBeenCalled();
    expect(cancelWorkflow).toHaveBeenCalledWith('thread-1');
  });

  it('resets the repository when the finished run belongs to this app', async () => {
    const resetRepoChanges = jest.fn().mockResolvedValue(undefined);
    const threads = createThreadState({
      selectedThreadId: 'thread-a',
      chatThreads: [{ id: 'thread-a', title: 'Tråd A', createdAt: '2026-01-01T00:00:00Z' }],
      createMessage: jest.fn().mockResolvedValue({ id: 'persisted-message-id' }),
    });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads, { resetRepoChanges });

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'assistant_message',
        session_id: 'thread-a',
        data: { content: 'Svar', mode: 'edit' },
      });
    });

    expect(resetRepoChanges).toHaveBeenCalled();
  });

  it("does not reset this app's repository for a run belonging to another app", async () => {
    const resetRepoChanges = jest.fn().mockResolvedValue(undefined);
    const threads = createThreadState({
      selectedThreadId: 'thread-a',
      chatThreads: [{ id: 'thread-a', title: 'Tråd A', createdAt: '2026-01-01T00:00:00Z' }],
      createMessage: jest.fn().mockResolvedValue({ id: 'persisted-message-id' }),
    });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    renderUseAssistantWorkflow(threads, { resetRepoChanges });

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'assistant_message',
        session_id: 'thread-from-other-app',
        data: { content: 'Svar', mode: 'edit' },
      });
    });

    expect(resetRepoChanges).not.toHaveBeenCalled();
    expect(threads.createMessage).not.toHaveBeenCalled();
    expect(threads.refreshMessages).not.toHaveBeenCalled();
  });

  it('ignores an error event for a run belonging to another app', async () => {
    const threads = createThreadState({
      selectedThreadId: 'thread-a',
      chatThreads: [{ id: 'thread-a', title: 'Tråd A', createdAt: '2026-01-01T00:00:00Z' }],
    });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'error',
        session_id: 'thread-from-other-app',
        data: { message: 'Noe gikk galt' },
      });
    });

    expect(threads.createMessage).not.toHaveBeenCalled();
    expect(threads.refreshMessages).not.toHaveBeenCalled();
    expect(result.current.workflowStatusByThread['thread-from-other-app']).toBeUndefined();
  });

  it('ignores a status event for a run belonging to another app', async () => {
    const threads = createThreadState({
      selectedThreadId: 'thread-a',
      chatThreads: [{ id: 'thread-a', title: 'Tråd A', createdAt: '2026-01-01T00:00:00Z' }],
    });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-from-other-app',
        data: { message: 'Skanner repo' },
      });
    });

    expect(result.current.workflowStatusByThread['thread-from-other-app']).toBeUndefined();
    expect(threads.refreshMessages).not.toHaveBeenCalled();
  });

  it('restores the trail when the cancel request fails mid-run', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const threads = createThreadState({ selectedThreadId: 'thread-a' });

    let capturedOnAgentMessage: ((event: WorkflowEvent) => void) | null = null;
    mockUseAssistantWebSocket.mockReturnValue({
      connectionStatus: 'connected',
      startWorkflow: jest.fn(),
      cancelWorkflow: jest.fn().mockRejectedValue(new Error('Hub disconnected')),
      respondToPermission: jest.fn(),
      registerSession: jest.fn(),
      onAgentMessage: jest.fn((callback) => {
        capturedOnAgentMessage = callback;
      }),
    });
    mockUseCurrentBranchQuery.mockReturnValue({
      data: createMockCurrentBranchInfo(),
    } as UseQueryResult<CurrentBranchInfo>);

    const { result } = renderUseAssistantWorkflow(threads);

    await act(async () => {
      capturedOnAgentMessage!({
        type: 'workflow_status',
        session_id: 'thread-a',
        data: { message: 'Skanner repo', tool_use_id: 'tool-1' },
      });
    });

    await act(async () => {
      await result.current.cancelCurrentWorkflow();
    });

    const status = result.current.workflowStatusByThread['thread-a'];
    expect(status?.isActive).toBe(true);
    expect(status?.steps).toHaveLength(1);
    expect(status?.message).toBe('Skanner repo');
    consoleErrorSpy.mockRestore();
  });
});

const createThreadState = (overrides: Partial<AssistantThreadState> = {}): AssistantThreadState => {
  const base: AssistantThreadState = {
    chatThreads: [],
    selectedThreadId: null,
    chatMessages: [],
    selectThread: jest.fn(),
    createThread: jest.fn().mockResolvedValue('new-thread-id'),
    deleteThread: jest.fn(),
    deleteMessage: jest.fn(),
    createMessage: jest.fn(),
    refreshMessages: jest.fn(),
    ...overrides,
  };
  if (base.selectedThreadId && !overrides.chatThreads) {
    base.chatThreads = [
      { id: base.selectedThreadId, title: 'Tråd', createdAt: '2026-01-01T00:00:00Z' },
    ];
  }
  return base;
};

const renderUseAssistantWorkflow = (
  threads: AssistantThreadState,
  queries: Partial<ServicesContextProps> = {},
) => {
  const queryClient = new QueryClient();
  return renderHookWithProviders(queries, queryClient)(() => useAssistantWorkflow(threads))
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
