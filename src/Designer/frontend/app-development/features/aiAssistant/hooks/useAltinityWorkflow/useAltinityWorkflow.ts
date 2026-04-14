import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  UserMessage,
  AssistantMessage,
  WorkflowEvent,
  WorkflowStatus,
  ConnectionStatus,
  AssistantMessageData,
} from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useCurrentBranchQuery } from 'app-shared/hooks/queries/useCurrentBranchQuery';
import { useResetRepositoryMutation } from 'app-shared/hooks/mutations/useResetRepositoryMutation';
import { useCheckoutBranchMutation } from 'app-shared/hooks/mutations/useCheckoutBranchMutation';
import { useAltinityWebSocket } from '../useAltinityWebSocket/useAltinityWebSocket';
import type { AltinityThreadState } from '../useAltinityThreads/useAltinityThreads';
import {
  formatRejectionMessage,
  getAssistantMessageContent,
  getAssistantMessageTimestamp,
  shouldSkipBranchOps,
} from '../../utils/messageUtils';

const INITIAL_WORKFLOW_MESSAGE = 'Jobber med saken...';
const DEFAULT_WORKFLOW_WAIT_MESSAGE = 'Vent litt...';

export interface UseAltinityWorkflowResult {
  connectionStatus: ConnectionStatus;
  workflowStatus: WorkflowStatus;
  onSubmitUserMessage: (message: UserMessage) => Promise<void>;
  resetWorkflowStatus: () => void;
  cancelCurrentWorkflow: () => Promise<void>;
  cancelledMessageContent: string | null;
  clearCancelledMessageContent: () => void;
}

export const useAltinityWorkflow = (threads: AltinityThreadState): UseAltinityWorkflowResult => {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ isActive: false });
  const [cancelledMessageContent, setCancelledMessageContent] = useState<string | null>(null);
  const {
    connectionStatus,
    sessionId: backendSessionId,
    startWorkflow,
    cancelWorkflow,
    onAgentMessage,
  } = useAltinityWebSocket();
  const { org, app } = useStudioEnvironmentParams();
  const { data: currentBranchInfo } = useCurrentBranchQuery(org, app);
  const { mutate: resetRepository } = useResetRepositoryMutation(org, app);
  const { mutate: checkoutBranch } = useCheckoutBranchMutation(org, app);
  const currentBranch = currentBranchInfo?.branchName;
  const currentBranchRef = useRef<string>('main');
  const backendSessionIdRef = useRef<string | null>(backendSessionId);

  const {
    currentSessionId,
    currentSessionIdRef,
    setCurrentSession,
    createThread,
    addMessageToThread,
    removeLoadingMessage,
    replaceLoadingWithMessage,
    removeCancelledMessages,
    upsertAssistantMessage,
  } = threads;

  useEffect(() => {
    backendSessionIdRef.current = backendSessionId;
  }, [backendSessionId]);

  useEffect(() => {
    if (currentBranch) {
      currentBranchRef.current = currentBranch;
    }
  }, [currentBranch]);

  const resetWorkflowStatus = useCallback(() => {
    setWorkflowStatus({ isActive: false });
  }, []);

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
      const branch = buildSessionBranch(sessionId);
      resetRepository(undefined, {
        onSuccess: () => {
          checkoutBranch(branch, {
            onSuccess: () => {
              currentBranchRef.current = branch;
            },
          });
        },
      });
    },
    [resetRepository, checkoutBranch],
  );

  const handleAssistantMessage = useCallback(
    (event: WorkflowEvent & { type: 'assistant_message' }) => {
      const assistantMessage = event.data;
      const messageContent = getAssistantMessageContent(assistantMessage);
      const messageTimestamp = getAssistantMessageTimestamp(assistantMessage);
      markWorkflowCompleted(assistantMessage, messageTimestamp);

      if (!event.session_id) return;

      upsertAssistantMessage(event.session_id, assistantMessage, messageContent, messageTimestamp);

      if (!shouldSkipBranchOps(assistantMessage)) {
        resetRepoForSession(event.session_id);
      }
    },
    [resetRepoForSession, markWorkflowCompleted, upsertAssistantMessage],
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
        const currentSession = currentSessionIdRef.current;
        if (currentSession) {
          if (event.data?.status === 'cancelled') {
            removeLoadingMessage(currentSession);
          } else {
            replaceLoadingWithMessage(currentSession, createAssistantErrorMessage());
          }
        }
      }
    },
    [
      applyStatusMessage,
      handleAssistantMessage,
      currentSessionIdRef,
      removeLoadingMessage,
      replaceLoadingWithMessage,
    ],
  );

  useEffect(() => {
    onAgentMessage((event: WorkflowEvent) => {
      const activeBackendSession = backendSessionIdRef.current;

      if (event.session_id && activeBackendSession && event.session_id !== activeBackendSession) {
        return;
      }

      handleWorkflowEvent(event);
    });
  }, [onAgentMessage, handleWorkflowEvent]);

  const runWorkflowForSession = useCallback(
    async (threadId: string, userMessage: UserMessage): Promise<void> => {
      const activeSession = backendSessionIdRef.current;
      if (!activeSession) {
        console.error('No active backend session — connection not established');
        return;
      }

      addMessageToThread(threadId, userMessage);
      addMessageToThread(threadId, createAssistantLoadingMessage());

      setWorkflowStatus({
        isActive: true,
        sessionId: activeSession,
        currentStep: 'Initializing',
        message: INITIAL_WORKFLOW_MESSAGE,
      });

      const branchToUse = currentBranch ?? currentBranchRef.current ?? 'main';

      try {
        const result = await startWorkflow({
          session_id: activeSession,
          goal: userMessage.content,
          org,
          app,
          branch: branchToUse,
          allow_app_changes: userMessage.allowAppChanges ?? false,
          attachments: userMessage.attachments,
        });

        if (!result.accepted) {
          setWorkflowStatus({ isActive: false });
          replaceLoadingWithMessage(threadId, {
            author: MessageAuthor.Assistant,
            content: formatRejectionMessage(result),
            timestamp: new Date(),
            filesChanged: [],
          });
        }
      } catch (error) {
        console.error('Workflow request failed:', error);
        setWorkflowStatus({ isActive: false });
        replaceLoadingWithMessage(threadId, createAssistantErrorMessage());
      }
    },
    [addMessageToThread, app, currentBranch, org, replaceLoadingWithMessage, startWorkflow],
  );

  const onSubmitUserMessage = useCallback(
    async (message: UserMessage): Promise<void> => {
      if (!message.content) return;

      if (currentSessionId) {
        await runWorkflowForSession(currentSessionId, message);
        return;
      }

      if (!backendSessionId) {
        console.error('No backend session ID available - connection not established');
        return;
      }

      const threadTitle = createThreadTitle(message.content);

      try {
        const threadId = await createThread(threadTitle);
        setCurrentSession(threadId);
        await runWorkflowForSession(threadId, message);
      } catch (error) {
        console.error('Failed to create thread:', error);
        setWorkflowStatus({ isActive: false });
      }
    },
    [backendSessionId, currentSessionId, createThread, runWorkflowForSession, setCurrentSession],
  );

  const cancelCurrentWorkflow = useCallback(async (): Promise<void> => {
    const threadId = currentSessionIdRef.current;
    if (!threadId) return;
    setWorkflowStatus({ isActive: false });
    const restoredContent = removeCancelledMessages(threadId);
    if (restoredContent) {
      setCancelledMessageContent(restoredContent);
    }
    const activeSession = backendSessionIdRef.current;
    if (!activeSession) return;
    try {
      await cancelWorkflow(activeSession);
    } catch (error) {
      console.error('Cancel workflow request failed:', error);
    }
  }, [cancelWorkflow, currentSessionIdRef, removeCancelledMessages]);

  const clearCancelledMessageContent = useCallback(() => {
    setCancelledMessageContent(null);
  }, []);

  return {
    connectionStatus,
    workflowStatus,
    onSubmitUserMessage,
    resetWorkflowStatus,
    cancelCurrentWorkflow,
    cancelledMessageContent,
    clearCancelledMessageContent,
  };
};

function buildSessionBranch(sessionId: string): string {
  const uniqueIdWithoutPrefix = sessionId.startsWith('session_')
    ? sessionId.substring(8, 16)
    : sessionId.substring(0, 8);
  return `altinity_session_${uniqueIdWithoutPrefix}`;
}

function createAssistantLoadingMessage(): AssistantMessage {
  return {
    author: MessageAuthor.Assistant,
    content: `\n\nVent litt...`,
    timestamp: new Date(),
    filesChanged: [],
    isLoading: true,
  };
}

function createAssistantErrorMessage(): AssistantMessage {
  return {
    author: MessageAuthor.Assistant,
    content:
      'Beklager, noe gikk galt under behandlingen av forespørselen din. Vennligst prøv igjen.',
    timestamp: new Date(),
    filesChanged: [],
  };
}

function createThreadTitle(messageContent: string): string {
  const titleMaxLength = 50;
  const truncatedMessageContent = messageContent.slice(0, titleMaxLength);
  const punctuation = messageContent.length > titleMaxLength ? '...' : '';
  return truncatedMessageContent + punctuation;
}
