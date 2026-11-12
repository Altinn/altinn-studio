import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  UserMessage,
  Message,
  WorkflowEvent,
  WorkflowStatus,
  TrailStep,
  ConnectionStatus,
  AssistantMessageData,
  UserAttachment,
  PermissionRequest,
} from '@designer/assistant';
import { MessageAuthor } from '@designer/assistant';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useStartAssistantWorkflowMutation } from 'app-shared/hooks/mutations/useStartAssistantWorkflowMutation';
import { useCancelAssistantWorkflowMutation } from 'app-shared/hooks/mutations/useCancelAssistantWorkflowMutation';
import { useRespondToAssistantPermissionMutation } from 'app-shared/hooks/mutations/useRespondToAssistantPermissionMutation';
import { useAssistantWebSocket } from '../useAssistantWebSocket/useAssistantWebSocket';
import type { AssistantThreadState } from '../useAssistantThreads/useAssistantThreads';
import { formatRejectedEventMessage, getAssistantMessageTimestamp } from '../../utils/messageUtils';
import type { RejectionTexts } from '../../utils/messageUtils';
import { createWorkflowFormData } from '../../utils/workflowFormData';

const INITIAL_WORKFLOW_MESSAGE = 'Tenker på oppgaven';
const DEFAULT_WORKFLOW_WAIT_MESSAGE = 'Vent litt...';
const WORKFLOW_ERROR_MESSAGE =
  'Beklager, noe gikk galt under behandlingen av forespørselen din. Prøv igjen, eller ta kontakt med oss.';
// Status events this soon after a terminal event are stragglers from the finished run.
const ADOPTION_GRACE_AFTER_TERMINAL_MS = 10_000;
const MAX_HANDLED_ASSISTANT_EVENTS = 200;

export interface UseAssistantWorkflowResult {
  connectionStatus: ConnectionStatus;
  workflowStatusByThread: Record<string, WorkflowStatus>;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  cancelCurrentWorkflow: () => Promise<void>;
  respondToPermission: (requestId: string, granted: boolean) => Promise<void>;
  cancelledMessageContent: string | null;
  clearCancelledMessageContent: () => void;
  messages: Message[];
}

export const useAssistantWorkflow = (threads: AssistantThreadState): UseAssistantWorkflowResult => {
  const { t } = useTranslation();
  const rejectionTexts: RejectionTexts = useMemo(
    () => ({
      heading: t('ai_assistant.request_rejected_heading'),
      suggestionsLabel: t('ai_assistant.suggestions_label'),
    }),
    [t],
  );
  const [workflowStatusByThread, setWorkflowStatusByThread] = useState<
    Record<string, WorkflowStatus>
  >({});
  const [cancelledMessageContent, setCancelledMessageContent] = useState<string | null>(null);
  const { connectionStatus, onAgentMessage } = useAssistantWebSocket();
  const { mutateAsync: startWorkflow } = useStartAssistantWorkflowMutation();
  const { mutateAsync: cancelWorkflow } = useCancelAssistantWorkflowMutation();
  const { mutateAsync: sendPermissionResponse } = useRespondToAssistantPermissionMutation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);
  const { mutateAsync: resetRepository } = useResetRepositoryMutation(org, app);
  const { mutateAsync: checkoutBranch } = useCheckoutBranchMutation(org, app);
  const currentBranch = currentBranchInfo?.branchName;
  // Trail-clock anchor per thread; each step records its offset from this.
  const workflowStartedAtMsByThreadRef = useRef<Record<string, number>>({});
  const handledAssistantEventsRef = useRef<Set<string>>(new Set());
  // When each thread's run last ended.
  const terminatedAtMsByThreadRef = useRef<Record<string, number>>({});
  // Threads whose messages are already fetched for the current run.
  const runMessagesRefreshedThreadsRef = useRef<Set<string>>(new Set());
  const pendingStartsByThreadRef = useRef<Record<string, Promise<void>>>({});

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
    runMessagesRefreshedThreadsRef.current.delete(threadId);
    // The next run must anchor its own trail clock.
    delete workflowStartedAtMsByThreadRef.current[threadId];
  }, []);

  const markThreadStillRunning = useCallback(
    (threadId: string, previousStatus: WorkflowStatus | undefined) => {
      delete terminatedAtMsByThreadRef.current[threadId];
      setWorkflowStatus(threadId, {
        ...previousStatus,
        isActive: true,
        sessionId: previousStatus?.sessionId ?? threadId,
      });
    },
    [setWorkflowStatus],
  );

  const isRecentlyTerminated = useCallback((threadId: string): boolean => {
    const terminatedAtMs = terminatedAtMsByThreadRef.current[threadId];
    return (
      terminatedAtMs !== undefined &&
      performance.now() - terminatedAtMs < ADOPTION_GRACE_AFTER_TERMINAL_MS
    );
  }, []);

  const markWorkflowCompleted = useCallback(
    (threadId: string, assistantMessage: AssistantMessageData) => {
      markThreadTerminated(threadId);
      setWorkflowStatus(threadId, {
        isActive: false,
        sessionId: threadId,
        currentStep: 'Completed',
        message: 'AI agent workflow completed successfully',
        lastCompletedAt: getAssistantMessageTimestamp(assistantMessage),
        filesChanged: assistantMessage.filesChanged || [],
      });
    },
    [setWorkflowStatus, markThreadTerminated],
  );

  // Fetches the initiating tab's user message when adopting a run this tab didn't start.
  const refreshMessagesForAdoptedRun = useCallback(
    (threadId: string) => {
      if (isRecentlyTerminated(threadId)) return;
      if (runMessagesRefreshedThreadsRef.current.has(threadId)) return;
      runMessagesRefreshedThreadsRef.current.add(threadId);
      refreshMessages(threadId);
    },
    [isRecentlyTerminated, refreshMessages],
  );

  const applyStatusMessage = useCallback(
    (threadId: string, statusMessage: string, toolUseId?: string, elapsedMs?: number) => {
      // elapsed_ms (time since run start, set by the assistant service) is
      // authoritative for the trail clock.
      if (elapsedMs !== undefined) {
        workflowStartedAtMsByThreadRef.current[threadId] = performance.now() - elapsedMs;
      } else {
        workflowStartedAtMsByThreadRef.current[threadId] ??= performance.now();
      }
      setWorkflowStatusByThread((prev) => {
        const existing = prev[threadId];
        // No active workflow here means another tab started the run — adopt
        // it, unless the status is a straggler from a run that just ended.
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
        await sendPermissionResponse({ threadId, payload: { requestId, granted } });
        clearPermissionRequest(threadId);
      } catch (error) {
        console.error('Permission response failed:', error);
      }
    },
    [workflowStatusByThread, clearPermissionRequest, sendPermissionResponse],
  );

  // Agent events reach every tab, including tabs open on other apps.
  const ownsThread = useCallback(
    (threadId: string) => threads.chatThreads.some((thread) => thread.id === threadId),
    [threads.chatThreads],
  );

  // A callback on `mutate` does not run after this hook unmounts. The reset is slow,
  // and the user can go to a different page before the checkout starts.
  const switchToPushedBranch = useCallback(
    async (branch: string) => {
      try {
        await resetRepository();
        await checkoutBranch(branch);
      } catch {
        // The mutation cache shows the error to the user, except for a checkout conflict.
      }
    },
    [resetRepository, checkoutBranch],
  );

  const handleAssistantMessage = useCallback(
    (event: WorkflowEvent & { type: 'assistant_message' }) => {
      const threadId = event.session_id;
      if (!threadId) return;

      const assistantMessage = event.data;
      // Designer saves the answer before it forwards the event. The first copy can come from a
      // replica that could not save the answer, so each copy gets the messages again.
      // If you save a copy here, the thread shows the answer two times.
      refreshMessages(threadId);

      // eventId is stamped on every answer; traceId only exists when Langfuse is on.
      const dedupeId = assistantMessage.eventId ?? assistantMessage.traceId;
      const dedupeKey = dedupeId ? `${threadId}:${dedupeId}` : null;
      if (dedupeKey) {
        const handledEvents = handledAssistantEventsRef.current;
        if (handledEvents.has(dedupeKey)) return;
        handledEvents.add(dedupeKey);
        if (handledEvents.size > MAX_HANDLED_ASSISTANT_EVENTS) {
          handledEvents.delete(handledEvents.values().next().value);
        }
      }

      markWorkflowCompleted(threadId, assistantMessage);

      if (assistantMessage.pushedBranch) {
        switchToPushedBranch(assistantMessage.pushedBranch);
      }
    },
    [switchToPushedBranch, markWorkflowCompleted, refreshMessages],
  );

  const handleWorkflowEvent = useCallback(
    (event: WorkflowEvent) => {
      const threadId = event.session_id;
      if (!threadId || !ownsThread(threadId)) return;

      if (event.type === 'assistant_message') {
        handleAssistantMessage(event);
        return;
      }

      if (event.type === 'status') {
        const isTerminal =
          event.data?.status === 'completed' ||
          event.data?.status === 'failed' ||
          event.data?.done === true;
        if (isTerminal) {
          markThreadTerminated(threadId);
          setWorkflowStatus(threadId, { isActive: false });
        } else {
          refreshMessagesForAdoptedRun(threadId);
          applyStatusMessage(
            threadId,
            event.data?.message || DEFAULT_WORKFLOW_WAIT_MESSAGE,
            event.data?.tool_use_id,
            event.data?.elapsed_ms,
          );
        }
      } else if (event.type === 'workflow_status') {
        refreshMessagesForAdoptedRun(threadId);
        applyStatusMessage(
          threadId,
          event.data.message || DEFAULT_WORKFLOW_WAIT_MESSAGE,
          event.data?.tool_use_id,
          event.data?.elapsed_ms,
        );
      } else if (event.type === 'permission_request') {
        if (event.data.resolved) {
          // Answered in another tab or timed out.
          clearPermissionRequest(threadId);
        } else {
          applyPermissionRequest(threadId, {
            requestId: event.data.request_id,
            message: event.data.message ?? '',
          });
        }
      } else if (event.type === 'error') {
        markThreadTerminated(threadId);
        setWorkflowStatus(threadId, { isActive: false });
        if (event.data?.status === 'cancelled') {
          // Drop the message the cancelling tab deleted.
          refreshMessages(threadId);
          return;
        }
        // Rejections carry the actual reason — show it instead of the generic text.
        const content =
          event.data?.status === 'rejected'
            ? formatRejectedEventMessage(event.data, rejectionTexts)
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
      clearPermissionRequest,
      handleAssistantMessage,
      ownsThread,
      createMessage,
      setWorkflowStatus,
      markThreadTerminated,
      refreshMessagesForAdoptedRun,
      refreshMessages,
      rejectionTexts,
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
    ): Promise<void> => {
      if (!currentBranch)
        throw new Error('Current branch is unknown — branch query has not loaded');
      delete terminatedAtMsByThreadRef.current[threadId];
      // No adoption refetch needed — this tab wrote the user message itself.
      runMessagesRefreshedThreadsRef.current.add(threadId);
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
      const start = startWorkflow({
        threadId,
        payload: createWorkflowFormData({
          goal,
          branch: currentBranch,
          allowAppChanges,
          attachments,
        }),
      });
      pendingStartsByThreadRef.current[threadId] = start;
      try {
        await start;
      } catch (error) {
        runMessagesRefreshedThreadsRef.current.delete(threadId);
        delete workflowStartedAtMsByThreadRef.current[threadId];
        setWorkflowStatus(threadId, { isActive: false });
        throw error;
      } finally {
        if (pendingStartsByThreadRef.current[threadId] === start) {
          delete pendingStartsByThreadRef.current[threadId];
        }
      }
    },
    [currentBranch, startWorkflow, setWorkflowStatus],
  );

  const runWorkflowForSession = useCallback(
    async (threadId: string, userMessage: UserMessage): Promise<void> => {
      try {
        await createMessage(threadId, userMessage);
        await startAgentWorkflow(
          threadId,
          userMessage.content,
          userMessage.allowAppChanges,
          userMessage.attachments,
        );
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

      await runWorkflowForSession(threadId, message);
    },
    [selectedThreadId, createThread, runWorkflowForSession, selectThread],
  );

  const restoreCancelledMessage = useCallback(
    async (threadId: string, message: Message): Promise<void> => {
      try {
        await createMessage(threadId, message);
        setCancelledMessageContent(null);
      } catch (error) {
        console.error('Failed to restore the message after a failed cancel:', error);
      }
    },
    [createMessage],
  );

  const cancelCurrentWorkflow = useCallback(async (): Promise<void> => {
    const threadId = selectedThreadId;
    if (!selectedThreadId) return;

    const statusBeforeCancel = workflowStatusByThread[threadId];
    markThreadTerminated(threadId);
    setWorkflowStatus(threadId, { isActive: false });

    const latestPersistedMessage = chatMessages.at(-1);
    const noAssistantResponseReceived = latestPersistedMessage?.role === MessageAuthor.User;
    let deletedMessage: Message | undefined;
    if (noAssistantResponseReceived) {
      try {
        // Delete before the cancel round-trip — the refetch it triggers in
        // every tab must not resurrect this message.
        await deleteMessage(threadId, latestPersistedMessage.id);
        deletedMessage = latestPersistedMessage;
        setCancelledMessageContent(latestPersistedMessage.content);
      } catch (error) {
        console.error('Failed to delete the cancelled message:', error);
      }
    }

    // The assistant service cannot cancel a run that has not started yet, and the start request
    // answers when the run has started.
    const pendingStart = pendingStartsByThreadRef.current[threadId];
    if (pendingStart) {
      const started = await pendingStart.then(
        () => true,
        () => false,
      );
      if (!started) return;
    }

    try {
      await cancelWorkflow(threadId);
    } catch (error) {
      // The run is still going, so stop showing it as stopped.
      markThreadStillRunning(threadId, statusBeforeCancel);
      // The run continues, so the answer needs its prompt above it.
      if (deletedMessage) await restoreCancelledMessage(threadId, deletedMessage);
      console.error('Cancel workflow request failed:', error);
    }
  }, [
    cancelWorkflow,
    selectedThreadId,
    deleteMessage,
    chatMessages,
    setWorkflowStatus,
    markThreadStillRunning,
    restoreCancelledMessage,
    workflowStatusByThread,
    markThreadTerminated,
  ]);

  const clearCancelledMessageContent = useCallback(() => {
    setCancelledMessageContent(null);
  }, []);

  return {
    connectionStatus,
    workflowStatusByThread,
    onSubmitMessage,
    cancelCurrentWorkflow,
    respondToPermission,
    cancelledMessageContent,
    clearCancelledMessageContent,
    messages: chatMessages,
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

function createThreadTitle(messageContent: string): string {
  const titleMaxLength = 50;
  const truncatedMessageContent = messageContent.slice(0, titleMaxLength);
  const punctuation = messageContent.length > titleMaxLength ? '...' : '';
  return truncatedMessageContent + punctuation;
}
