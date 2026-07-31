import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  UserMessage,
  AssistantMessage,
  Message,
  WorkflowEvent,
  WorkflowStatus,
  TrailStep,
  ConnectionStatus,
  AssistantMessageData,
  AgentResponse,
  UserAttachment,
  PermissionRequest,
} from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useAltinityWebSocket } from '../useAltinityWebSocket/useAltinityWebSocket';
import type { AltinityThreadState } from '../useAltinityThreads/useAltinityThreads';
import {
  decorateMessagesWithTraceIds,
  formatRejectedEventMessage,
  formatRejectionMessage,
  getAssistantMessageContent,
  getAssistantMessageTimestamp,
  shouldSkipBranchOps,
} from '../../utils/messageUtils';

const INITIAL_WORKFLOW_MESSAGE = 'Tenker på oppgaven';
const DEFAULT_WORKFLOW_WAIT_MESSAGE = 'Vent litt...';
const WORKFLOW_ERROR_MESSAGE =
  'Beklager, noe gikk galt under behandlingen av forespørselen din. Vennligst prøv igjen.';
// How long after a terminal event (completion, error, cancel) a status event
// is treated as a straggler from the finished run rather than as a new run to
// adopt. The agents service stops emitting progress events for cancelled
// sessions, so this only has to absorb events already in flight.
const ADOPTION_GRACE_AFTER_TERMINAL_MS = 10_000;

export interface UseAltinityWorkflowResult {
  connectionStatus: ConnectionStatus;
  workflowStatusByThread: Record<string, WorkflowStatus>;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  cancelCurrentWorkflow: () => Promise<void>;
  respondToPermission: (requestId: string, granted: boolean) => Promise<void>;
  cancelledMessageContent: string | null;
  clearCancelledMessageContent: () => void;
  messages: Message[];
}

// TODO: rename to useAssistantWorkflow.
export const useAltinityWorkflow = (threads: AltinityThreadState): UseAltinityWorkflowResult => {
  const [workflowStatusByThread, setWorkflowStatusByThread] = useState<
    Record<string, WorkflowStatus>
  >({});
  const [cancelledMessageContent, setCancelledMessageContent] = useState<string | null>(null);
  const [traceIdsByMessageId, setTraceIdsByMessageId] = useState<Record<string, string>>({});
  const {
    connectionStatus,
    startWorkflow,
    cancelWorkflow,
    respondToPermission: sendPermissionResponse,
    registerSession,
    onAgentMessage,
  } = useAltinityWebSocket();
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);
  const { mutate: resetRepository } = useResetRepositoryMutation(org, app);
  const { mutate: checkoutBranch } = useCheckoutBranchMutation(org, app);
  const currentBranch = currentBranchInfo?.branchName;
  // Monotonic clock anchor per workflow thread. Each trail step records
  // its offset from this value so timestamps don't drift if the wall clock
  // changes mid-flight.
  const workflowStartedAtMsByThreadRef = useRef<Record<string, number>>({});
  // Idempotency guard: a delivered-twice assistant_message (stale connection,
  // HMR) must render and persist exactly once. Keyed on traceId, which is
  // unique per workflow run; events without one pass through untouched so a
  // legitimately repeated identical answer is never dropped.
  const handledAssistantTraceIdsRef = useRef<Set<string>>(new Set());
  // When each thread's run last ended (completed, failed or cancelled). Status
  // events inside the grace window after that moment are stragglers from the
  // finished run — adopting them would show an active workflow that nothing
  // will ever mark as done again.
  const terminatedAtMsByThreadRef = useRef<Record<string, number>>({});

  const {
    selectedThreadId,
    selectThread,
    createThread,
    deleteMessage,
    createMessage,
    refreshMessages,
    chatMessages,
  } = threads;

  const setWorkflowStatus = useCallback((threadId: string, status: WorkflowStatus) => {
    setWorkflowStatusByThread((prev) => ({ ...prev, [threadId]: status }));
  }, []);

  const markThreadTerminated = useCallback((threadId: string) => {
    terminatedAtMsByThreadRef.current[threadId] = performance.now();
  }, []);

  const isRecentlyTerminated = useCallback((threadId: string): boolean => {
    const terminatedAtMs = terminatedAtMsByThreadRef.current[threadId];
    return (
      terminatedAtMs !== undefined &&
      performance.now() - terminatedAtMs < ADOPTION_GRACE_AFTER_TERMINAL_MS
    );
  }, []);

  const markWorkflowCompleted = useCallback(
    (threadId: string, assistantMessage: AssistantMessageData, messageTimestamp: Date) => {
      markThreadTerminated(threadId);
      setWorkflowStatus(threadId, {
        isActive: false,
        sessionId: threadId,
        currentStep: 'Completed',
        message: 'AI agent workflow completed successfully',
        lastCompletedAt: messageTimestamp,
        filesChanged: assistantMessage.filesChanged || [],
      });
    },
    [setWorkflowStatus, markThreadTerminated],
  );

  const applyStatusMessage = useCallback(
    (threadId: string, statusMessage: string, toolUseId?: string) => {
      workflowStartedAtMsByThreadRef.current[threadId] ??= performance.now();
      setWorkflowStatusByThread((prev) => {
        const existing = prev[threadId];
        // A status event for a thread with no active workflow means a run is
        // in flight that THIS tab didn't start — another tab submitted it, or
        // this tab remounted mid-run. Adopt it (with a fresh trail from this
        // point on) so every tab shows the live activity, not just the
        // initiator. Exception: right after a terminal event the status is a
        // straggler from the finished run, not a new one — adopting it would
        // strand the spinner since no completion will follow.
        if (!existing?.isActive && isRecentlyTerminated(threadId)) return prev;
        const prevStatus: WorkflowStatus = existing?.isActive
          ? existing
          : { isActive: true, sessionId: threadId };
        const steps = prevStatus.steps ?? [];
        const lastStep = steps.at(-1);

        const matchIndex = toolUseId ? findStepIndexByToolUseId(steps, toolUseId) : -1;
        if (matchIndex >= 0) {
          const updated: TrailStep = { ...steps[matchIndex], message: statusMessage };
          return {
            ...prev,
            [threadId]: {
              ...prevStatus,
              message: statusMessage,
              steps: [...steps.slice(0, matchIndex), updated, ...steps.slice(matchIndex + 1)],
            },
          };
        }

        // Dedupe identical text bursts; refresh legacy `message` only.
        if (lastStep?.message === statusMessage) {
          return { ...prev, [threadId]: { ...prevStatus, message: statusMessage } };
        }

        const startedAtMs = workflowStartedAtMsByThreadRef.current[threadId] ?? performance.now();
        const newStep: TrailStep = {
          id: `${steps.length}-${Math.round(performance.now())}`,
          message: statusMessage,
          offsetMs: performance.now() - startedAtMs,
          toolUseId,
        };
        return {
          ...prev,
          [threadId]: {
            ...prevStatus,
            message: statusMessage,
            steps: [...steps, newStep],
          },
        };
      });
    },
    [isRecentlyTerminated],
  );

  const applyPermissionRequest = useCallback(
    (threadId: string, permissionRequest: PermissionRequest) => {
      setWorkflowStatusByThread((prev) => {
        const prevStatus = prev[threadId];
        if (!prevStatus?.isActive) return prev;
        return { ...prev, [threadId]: { ...prevStatus, permissionRequest } };
      });
    },
    [],
  );

  const clearPermissionRequest = useCallback((threadId: string) => {
    setWorkflowStatusByThread((prev) => {
      const prevStatus = prev[threadId];
      if (!prevStatus?.permissionRequest) return prev;
      const { permissionRequest: _cleared, ...rest } = prevStatus;
      return { ...prev, [threadId]: rest };
    });
  }, []);

  const respondToPermission = useCallback(
    async (requestId: string, granted: boolean): Promise<void> => {
      const threadId = findThreadIdByPermissionRequestId(workflowStatusByThread, requestId);
      if (!threadId) return;
      try {
        await sendPermissionResponse(threadId, requestId, granted);
        clearPermissionRequest(threadId);
      } catch (error) {
        console.error('Permission response failed:', error);
      }
    },
    [workflowStatusByThread, clearPermissionRequest, sendPermissionResponse],
  );

  const resetRepoForSession = useCallback(
    (sessionId: string) => {
      const branch = buildSessionBranchName(sessionId);
      resetRepository(undefined, {
        onSuccess: () => {
          checkoutBranch(branch);
        },
      });
    },
    [resetRepository, checkoutBranch],
  );

  const handleAssistantMessage = useCallback(
    async (event: WorkflowEvent & { type: 'assistant_message' }) => {
      const threadId = event.session_id;
      if (!threadId) return;

      const assistantMessage = event.data;
      if (assistantMessage.traceId) {
        const traceKey = `${threadId}:${assistantMessage.traceId}`;
        if (handledAssistantTraceIdsRef.current.has(traceKey)) return;
        handledAssistantTraceIdsRef.current.add(traceKey);
      }

      const messageContent = getAssistantMessageContent(assistantMessage);
      const messageTimestamp = getAssistantMessageTimestamp(assistantMessage);
      markWorkflowCompleted(threadId, assistantMessage, messageTimestamp);

      if (assistantMessage.persistedMessageId) {
        // The Designer backend already persisted this message (exactly once,
        // no matter how many tabs receive the broadcast) — pull the stored
        // row into the cache instead of persisting a client-side copy.
        refreshMessages(threadId);
        if (assistantMessage.traceId) {
          setTraceIdsByMessageId((prev) => ({
            ...prev,
            [assistantMessage.persistedMessageId]: assistantMessage.traceId,
          }));
        }
      } else {
        // Unenriched event (server-side persist failed or skipped) — persist
        // client-side as before, so the answer is never lost.
        const finalAssistantMessage: AssistantMessage = {
          role: MessageAuthor.Assistant,
          content: messageContent,
          createdAt: messageTimestamp.toISOString(),
          filesChanged: assistantMessage.filesChanged || [],
          sources: assistantMessage.sources || [],
        };
        const persisted = await createMessage(threadId, finalAssistantMessage);

        if (assistantMessage.traceId && persisted?.id) {
          setTraceIdsByMessageId((prev) => ({
            ...prev,
            [persisted.id]: assistantMessage.traceId,
          }));
        }
      }

      if (!shouldSkipBranchOps(assistantMessage)) {
        resetRepoForSession(threadId);
      }
    },
    [resetRepoForSession, markWorkflowCompleted, createMessage, refreshMessages],
  );

  const handleWorkflowEvent = useCallback(
    (event: WorkflowEvent) => {
      if (event.type === 'assistant_message') {
        handleAssistantMessage(event);
        return;
      }

      const threadId = event.session_id;
      if (!threadId) return;

      if (event.type === 'status') {
        const isTerminal =
          event.data?.status === 'completed' ||
          event.data?.status === 'failed' ||
          event.data?.done === true;
        if (isTerminal) {
          markThreadTerminated(threadId);
          setWorkflowStatus(threadId, { isActive: false });
        } else {
          applyStatusMessage(
            threadId,
            event.data?.message || DEFAULT_WORKFLOW_WAIT_MESSAGE,
            event.data?.tool_use_id,
          );
        }
      } else if (event.type === 'workflow_status') {
        applyStatusMessage(
          threadId,
          event.data.message || DEFAULT_WORKFLOW_WAIT_MESSAGE,
          event.data?.tool_use_id,
        );
      } else if (event.type === 'permission_request') {
        applyPermissionRequest(threadId, {
          requestId: event.data.request_id,
          message: event.data.message,
        });
      } else if (event.type === 'error') {
        markThreadTerminated(threadId);
        setWorkflowStatus(threadId, { isActive: false });
        if (event.data?.status === 'cancelled') return;
        // A rejection carries the actual reason (and often suggestions) —
        // show it instead of the generic failure text so the user knows
        // what to change.
        const content =
          event.data?.status === 'rejected'
            ? formatRejectedEventMessage(event.data)
            : WORKFLOW_ERROR_MESSAGE;
        createMessage(threadId, {
          role: MessageAuthor.Assistant,
          content,
          createdAt: new Date().toISOString(),
          filesChanged: [],
        });
      }
    },
    [
      applyStatusMessage,
      applyPermissionRequest,
      handleAssistantMessage,
      createMessage,
      setWorkflowStatus,
      markThreadTerminated,
    ],
  );

  useEffect(() => {
    onAgentMessage((event: WorkflowEvent) => {
      handleWorkflowEvent(event);
    });
  }, [onAgentMessage, handleWorkflowEvent]);

  const startAgentWorkflow = useCallback(
    async (
      threadId: string,
      goal: string,
      allowAppChanges: boolean,
      attachments?: UserAttachment[],
    ): Promise<AgentResponse> => {
      if (!currentBranch)
        throw new Error('Current branch is unknown — branch query has not loaded');
      // A fresh run: the previous run's terminal marker must not swallow the
      // new run's status events.
      delete terminatedAtMsByThreadRef.current[threadId];
      workflowStartedAtMsByThreadRef.current[threadId] = performance.now();
      const initialStep: TrailStep = {
        id: 'initial',
        message: INITIAL_WORKFLOW_MESSAGE,
        offsetMs: 0,
      };
      setWorkflowStatus(threadId, {
        isActive: true,
        sessionId: threadId,
        currentStep: 'Initializing',
        message: INITIAL_WORKFLOW_MESSAGE,
        steps: [initialStep],
      });
      try {
        const result = await startWorkflow({
          session_id: threadId,
          goal,
          org,
          app,
          branch: currentBranch,
          allow_app_changes: allowAppChanges,
          attachments,
        });
        if (!result.accepted) setWorkflowStatus(threadId, { isActive: false });
        return result;
      } catch (error) {
        setWorkflowStatus(threadId, { isActive: false });
        throw error;
      }
    },
    [app, currentBranch, org, startWorkflow, setWorkflowStatus],
  );

  const runWorkflowForSession = useCallback(
    async (threadId: string, userMessage: UserMessage): Promise<void> => {
      createMessage(threadId, userMessage);
      try {
        const result = await startAgentWorkflow(
          threadId,
          userMessage.content,
          userMessage.allowAppChanges,
          userMessage.attachments,
        );
        if (!result.accepted) {
          createMessage(threadId, {
            role: MessageAuthor.Assistant,
            content: formatRejectionMessage(result),
            createdAt: new Date().toISOString(),
            filesChanged: [],
          });
        }
      } catch (error) {
        console.error('Workflow request failed:', error);
        createMessage(threadId, {
          role: MessageAuthor.Assistant,
          content: WORKFLOW_ERROR_MESSAGE,
          createdAt: new Date().toISOString(),
          filesChanged: [],
        });
      }
    },
    [createMessage, startAgentWorkflow],
  );

  const onSubmitMessage = useCallback(
    async (message: UserMessage): Promise<void> => {
      if (!message.content) return;

      let threadId = selectedThreadId;
      if (!threadId) {
        try {
          threadId = await createThread(createThreadTitle(message.content));
          selectThread(threadId);
        } catch (error) {
          console.error('Failed to create thread:', error);
          return;
        }
      }

      try {
        await registerSession(org, app, threadId);
      } catch (error) {
        console.error('Failed to register session for thread:', error);
        setWorkflowStatus(threadId, { isActive: false });
        return;
      }

      await runWorkflowForSession(threadId, message);
    },
    [
      selectedThreadId,
      createThread,
      registerSession,
      org,
      app,
      runWorkflowForSession,
      selectThread,
      setWorkflowStatus,
    ],
  );

  const cancelCurrentWorkflow = useCallback(async (): Promise<void> => {
    const threadId = selectedThreadId;
    if (!selectedThreadId) return;

    markThreadTerminated(threadId);
    setWorkflowStatus(threadId, { isActive: false });

    const latestPersistedMessage = chatMessages.at(-1);
    const noAssistantResponseReceived = latestPersistedMessage?.role === MessageAuthor.User;
    if (noAssistantResponseReceived) {
      deleteMessage(threadId, latestPersistedMessage.id);
      setCancelledMessageContent(latestPersistedMessage.content);
    }

    try {
      await cancelWorkflow(threadId);
    } catch (error) {
      console.error('Cancel workflow request failed:', error);
    }
  }, [
    cancelWorkflow,
    selectedThreadId,
    deleteMessage,
    chatMessages,
    setWorkflowStatus,
    markThreadTerminated,
  ]);

  const clearCancelledMessageContent = useCallback(() => {
    setCancelledMessageContent(null);
  }, []);

  const messages = useMemo(
    () => decorateMessagesWithTraceIds(chatMessages, traceIdsByMessageId),
    [chatMessages, traceIdsByMessageId],
  );

  return {
    connectionStatus,
    workflowStatusByThread,
    onSubmitMessage,
    cancelCurrentWorkflow,
    respondToPermission,
    cancelledMessageContent,
    clearCancelledMessageContent,
    messages,
  };
};

function findThreadIdByPermissionRequestId(
  workflowStatusByThread: Record<string, WorkflowStatus>,
  requestId: string,
): string | undefined {
  return Object.keys(workflowStatusByThread).find(
    (threadId) => workflowStatusByThread[threadId].permissionRequest?.requestId === requestId,
  );
}

function findStepIndexByToolUseId(steps: TrailStep[], toolUseId: string): number {
  for (let index = steps.length - 1; index >= 0; index--) {
    if (steps[index].toolUseId === toolUseId) return index;
  }
  return -1;
}

function buildSessionBranchName(sessionId: string): string {
  const uniqueIdWithoutPrefix = sessionId.startsWith('session_')
    ? sessionId.substring(8, 16)
    : sessionId.substring(0, 8);
  return `altinity_session_${uniqueIdWithoutPrefix}`;
}

function createThreadTitle(messageContent: string): string {
  const titleMaxLength = 50;
  const truncatedMessageContent = messageContent.slice(0, titleMaxLength);
  const punctuation = messageContent.length > titleMaxLength ? '...' : '';
  return truncatedMessageContent + punctuation;
}
