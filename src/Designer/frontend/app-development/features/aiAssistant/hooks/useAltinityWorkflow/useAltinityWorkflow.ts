import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  UserMessage,
  AssistantMessage,
  Message,
  WorkflowEvent,
  WorkflowStatus,
  ConnectionStatus,
  AssistantMessageData,
  AgentResponse,
  UserAttachment,
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
  formatRejectionMessage,
  getAssistantMessageContent,
  getAssistantMessageTimestamp,
  shouldSkipBranchOps,
} from '../../utils/messageUtils';

const INITIAL_WORKFLOW_MESSAGE = 'Jobber med saken...';
const DEFAULT_WORKFLOW_WAIT_MESSAGE = 'Vent litt...';
const WORKFLOW_ERROR_MESSAGE =
  'Beklager, noe gikk galt under behandlingen av forespørselen din. Vennligst prøv igjen.';

export interface UseAltinityWorkflowResult {
  connectionStatus: ConnectionStatus;
  workflowStatusByThread: Record<string, WorkflowStatus>;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  deselectCurrentThread: () => void;
  cancelCurrentWorkflow: () => Promise<void>;
  cancelledMessageContent: string | null;
  clearCancelledMessageContent: () => void;
  messages: Message[];
}

export const useAltinityWorkflow = (threads: AltinityThreadState): UseAltinityWorkflowResult => {
  const [workflowStatusByThread, setWorkflowStatusByThread] = useState<
    Record<string, WorkflowStatus>
  >({});
  const [cancelledMessageContent, setCancelledMessageContent] = useState<string | null>(null);
  const [traceIdsByMessageId, setTraceIdsByMessageId] = useState<Record<string, string>>({});
  const { connectionStatus, startWorkflow, cancelWorkflow, registerSession, onAgentMessage } =
    useAltinityWebSocket();
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);
  const { mutate: resetRepository } = useResetRepositoryMutation(org, app);
  const { mutate: checkoutBranch } = useCheckoutBranchMutation(org, app);
  const currentBranch = currentBranchInfo?.branchName;
  const registeredThreadIds = useRef<Set<string>>(new Set());

  const {
    selectedThreadId,
    selectedThreadIdRef,
    setSelectedThread,
    createThread,
    deleteMessage,
    createMessage,
    chatMessages,
  } = threads;

  const setWorkflowStatus = useCallback((threadId: string, status: WorkflowStatus) => {
    setWorkflowStatusByThread((prev) => ({ ...prev, [threadId]: status }));
  }, []);

  const setWorkflowStatusMessage = useCallback((threadId: string, statusMessage: string) => {
    setWorkflowStatusByThread((prev) => {
      const prevWorkflowStatus = prev[threadId];
      return { ...prev, [threadId]: { ...prevWorkflowStatus, message: statusMessage } };
    });
  }, []);

  const deselectCurrentThread = useCallback(() => {
    setSelectedThread(null);
  }, [setSelectedThread]);

  const ensureSessionRegistered = useCallback(
    async (threadId: string): Promise<void> => {
      if (registeredThreadIds.current.has(threadId)) return;
      await registerSession(org, app, threadId);
      registeredThreadIds.current.add(threadId);
    },
    [registerSession, org, app],
  );

  const markWorkflowCompleted = useCallback(
    (threadId: string, assistantMessage: AssistantMessageData, messageTimestamp: Date) => {
      setWorkflowStatus(threadId, {
        isActive: false,
        sessionId: threadId,
        currentStep: 'Completed',
        message: 'AI agent workflow completed successfully',
        lastCompletedAt: messageTimestamp,
        filesChanged: assistantMessage.filesChanged || [],
      });
    },
    [setWorkflowStatus],
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
      const messageContent = getAssistantMessageContent(assistantMessage);
      const messageTimestamp = getAssistantMessageTimestamp(assistantMessage);
      markWorkflowCompleted(threadId, assistantMessage, messageTimestamp);

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

      if (!shouldSkipBranchOps(assistantMessage)) {
        resetRepoForSession(threadId);
      }
    },
    [resetRepoForSession, markWorkflowCompleted, createMessage],
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
          setWorkflowStatus(threadId, { isActive: false });
        } else {
          setWorkflowStatusMessage(threadId, event.data?.message || DEFAULT_WORKFLOW_WAIT_MESSAGE);
        }
      } else if (event.type === 'workflow_status') {
        setWorkflowStatusMessage(threadId, event.data.message || DEFAULT_WORKFLOW_WAIT_MESSAGE);
      } else if (event.type === 'error') {
        setWorkflowStatus(threadId, { isActive: false });
        if (event.data?.status === 'cancelled') return;
        createMessage(threadId, {
          role: MessageAuthor.Assistant,
          content: WORKFLOW_ERROR_MESSAGE,
          createdAt: new Date().toISOString(),
          filesChanged: [],
        });
      }
    },
    [setWorkflowStatusMessage, handleAssistantMessage, createMessage, setWorkflowStatus],
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
      setWorkflowStatus(threadId, {
        isActive: true,
        sessionId: threadId,
        currentStep: 'Initializing',
        message: INITIAL_WORKFLOW_MESSAGE,
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
          setSelectedThread(threadId);
        } catch (error) {
          console.error('Failed to create thread:', error);
          return;
        }
      }

      try {
        await ensureSessionRegistered(threadId);
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
      ensureSessionRegistered,
      runWorkflowForSession,
      setSelectedThread,
      setWorkflowStatus,
    ],
  );

  const cancelCurrentWorkflow = useCallback(async (): Promise<void> => {
    const threadId = selectedThreadIdRef.current;
    if (!threadId) return;

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
  }, [cancelWorkflow, selectedThreadIdRef, deleteMessage, chatMessages, setWorkflowStatus]);

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
    deselectCurrentThread,
    cancelCurrentWorkflow,
    cancelledMessageContent,
    clearCancelledMessageContent,
    messages,
  };
};

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
