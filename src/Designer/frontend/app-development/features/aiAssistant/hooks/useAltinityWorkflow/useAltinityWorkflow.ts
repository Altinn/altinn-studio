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
  workflowStatus: WorkflowStatus;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
  clearCurrentSession: () => void;
  cancelCurrentWorkflow: () => Promise<void>;
  cancelledMessageContent: string | null;
  clearCancelledMessageContent: () => void;
  messages: Message[];
}

export const useAltinityWorkflow = (threads: AltinityThreadState): UseAltinityWorkflowResult => {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ isActive: false });
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
    currentSessionId,
    currentSessionIdRef,
    setCurrentSession,
    createThread,
    deleteMessage,
    createMessage,
    chatMessages,
  } = threads;

  const ensureSessionRegistered = useCallback(
    async (threadId: string): Promise<void> => {
      if (registeredThreadIds.current.has(threadId)) return;
      await registerSession(org, app, threadId);
      registeredThreadIds.current.add(threadId);
    },
    [registerSession, org, app],
  );

  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
    setWorkflowStatus({ isActive: false });
  }, [setCurrentSession]);

  const markWorkflowCompleted = useCallback(
    (assistantMessage: AssistantMessageData, messageTimestamp: Date) => {
      setWorkflowStatus((prev) => ({
        ...prev,
        currentStep: 'Completed',
        message: 'AI agent workflow completed successfully',
        isActive: false,
        lastCompletedAt: messageTimestamp,
        filesChanged: assistantMessage.filesChanged || [],
      }));
    },
    [],
  );

  const applyStatusMessage = useCallback((statusMessage: string) => {
    setWorkflowStatus((prev) => ({ ...prev, message: statusMessage }));
  }, []);

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
      const assistantMessage = event.data;
      const messageContent = getAssistantMessageContent(assistantMessage);
      const messageTimestamp = getAssistantMessageTimestamp(assistantMessage);
      markWorkflowCompleted(assistantMessage, messageTimestamp);

      const threadId = event.session_id;
      if (!threadId) return;

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

      if (event.session_id && !shouldSkipBranchOps(assistantMessage)) {
        resetRepoForSession(event.session_id);
      }
    },
    [resetRepoForSession, markWorkflowCompleted, createMessage],
  );

  const handleWorkflowEvent = useCallback(
    (event: WorkflowEvent) => {
      if (event.type === 'assistant_message') {
        handleAssistantMessage(event);
      } else if (event.type === 'status') {
        const isTerminal =
          event.data?.status === 'completed' ||
          event.data?.status === 'failed' ||
          event.data?.done === true;
        if (isTerminal) {
          setWorkflowStatus({ isActive: false });
        } else {
          applyStatusMessage(event.data?.message || DEFAULT_WORKFLOW_WAIT_MESSAGE);
        }
      } else if (event.type === 'workflow_status') {
        applyStatusMessage(event.data.message || DEFAULT_WORKFLOW_WAIT_MESSAGE);
      } else if (event.type === 'error') {
        setWorkflowStatus({ isActive: false });
        const threadId = event.session_id;
        if (!threadId) return;
        if (event.data?.status === 'cancelled') return;
        createMessage(threadId, {
          role: MessageAuthor.Assistant,
          content: WORKFLOW_ERROR_MESSAGE,
          createdAt: new Date().toISOString(),
          filesChanged: [],
        });
      }
    },
    [applyStatusMessage, handleAssistantMessage, createMessage],
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
      setWorkflowStatus({
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
        if (!result.accepted) setWorkflowStatus({ isActive: false });
        return result;
      } catch (error) {
        setWorkflowStatus({ isActive: false });
        throw error;
      }
    },
    [app, currentBranch, org, startWorkflow],
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

      let threadId = currentSessionId;
      if (!threadId) {
        try {
          threadId = await createThread(createThreadTitle(message.content));
          setCurrentSession(threadId);
        } catch (error) {
          console.error('Failed to create thread:', error);
          setWorkflowStatus({ isActive: false });
          return;
        }
      }

      try {
        await ensureSessionRegistered(threadId);
      } catch (error) {
        console.error('Failed to register session for thread:', error);
        setWorkflowStatus({ isActive: false });
        return;
      }

      await runWorkflowForSession(threadId, message);
    },
    [
      currentSessionId,
      createThread,
      ensureSessionRegistered,
      runWorkflowForSession,
      setCurrentSession,
    ],
  );

  const cancelCurrentWorkflow = useCallback(async (): Promise<void> => {
    const threadId = currentSessionIdRef.current;
    if (!threadId) return;

    setWorkflowStatus({ isActive: false });

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
  }, [cancelWorkflow, currentSessionIdRef, deleteMessage, chatMessages]);

  const clearCancelledMessageContent = useCallback(() => {
    setCancelledMessageContent(null);
  }, []);

  const messages = useMemo(
    () => decorateMessagesWithTraceIds(chatMessages, traceIdsByMessageId),
    [chatMessages, traceIdsByMessageId],
  );

  return {
    connectionStatus,
    workflowStatus,
    onSubmitMessage,
    clearCurrentSession,
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
