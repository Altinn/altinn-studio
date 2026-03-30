import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  UserMessage,
  AssistantMessage,
  WorkflowEvent,
  WorkflowStatus,
  AgentResponse,
  ConnectionStatus,
  UserAttachment,
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

export interface UseAltinityWorkflowResult {
  connectionStatus: ConnectionStatus;
  workflowStatus: WorkflowStatus;
  onSubmitMessage: (message: UserMessage) => Promise<void>;
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
    addMessageToThread,
    removeLoadingMessage,
    replaceLoadingWithMessage,
    removeCancelledMessages,
    upsertAssistantMessage,
    updateWorkflowStatusMessage,
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

  const updateWorkflowCompletedStatus = useCallback(
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
      updateWorkflowCompletedStatus(assistantMessage, messageTimestamp);

      const currentSession = currentSessionIdRef.current;

      if (currentSession) {
        upsertAssistantMessage(currentSession, assistantMessage, messageContent, messageTimestamp);
      }

      if (!shouldSkipBranchOps(assistantMessage)) {
        const sessionId = event.session_id || currentSession;
        if (!sessionId) return;

        resetRepoForSession(sessionId);
      }
    },
    [
      currentSessionIdRef,
      resetRepoForSession,
      updateWorkflowCompletedStatus,
      upsertAssistantMessage,
    ],
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
          const sessionForStatus = currentSessionIdRef.current;
          if (sessionForStatus) {
            updateWorkflowStatusMessage(sessionForStatus, event.data?.message || 'Vent litt...');
          }
        }
      } else if (event.type === 'workflow_status') {
        const sessionForStatus = currentSessionIdRef.current;
        if (sessionForStatus) {
          updateWorkflowStatusMessage(sessionForStatus, event.data.message || 'Vent litt...');
        }
      } else if (event.type === 'error') {
        setWorkflowStatus({ isActive: false });
        const currentSession = currentSessionIdRef.current;
        if (currentSession) {
          if (event.data?.status === 'cancelled') {
            removeLoadingMessage(currentSession);
          } else {
            const errorMessage: AssistantMessage = {
              author: MessageAuthor.Assistant,
              content:
                'Beklager, noe gikk galt under behandlingen av forespørselen din. Vennligst prøv igjen.',
              timestamp: new Date(),
              filesChanged: [],
            };
            replaceLoadingWithMessage(currentSession, errorMessage);
          }
        }
      }
    },
    [
      currentSessionIdRef,
      handleAssistantMessage,
      removeLoadingMessage,
      replaceLoadingWithMessage,
      updateWorkflowStatusMessage,
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

  const startAgentWorkflow = useCallback(
    async (
      threadId: string,
      goal: string,
      allowAppChanges: boolean,
      attachments?: UserAttachment[],
    ): Promise<AgentResponse> => {
      const activeSession = backendSessionIdRef.current;
      if (!activeSession) {
        throw new Error('No active backend session — connection not established');
      }

      const initialAgentMessage: AssistantMessage = {
        author: MessageAuthor.Assistant,
        content: `\n\nVent litt...`,
        timestamp: new Date(),
        filesChanged: [],
        isLoading: true,
      };
      addMessageToThread(threadId, initialAgentMessage);
      setWorkflowStatus({
        isActive: true,
        sessionId: activeSession,
        currentStep: 'Initializing',
        message: 'Jobber med saken...',
      });

      const branchToUse = currentBranch ?? currentBranchRef.current ?? 'main';

      try {
        const result = await startWorkflow({
          session_id: activeSession,
          goal: goal,
          org: org,
          app: app,
          branch: branchToUse,
          allow_app_changes: allowAppChanges,
          attachments,
        });

        if (!result.accepted) {
          setWorkflowStatus({ isActive: false });
        }

        return result;
      } catch (error) {
        setWorkflowStatus({ isActive: false });
        throw error;
      }
    },
    [addMessageToThread, app, currentBranch, org, startWorkflow],
  );

  const runWorkflowForSession = useCallback(
    async (threadId: string, userMessage: UserMessage): Promise<void> => {
      addMessageToThread(threadId, userMessage);

      try {
        const result = await startAgentWorkflow(
          threadId,
          userMessage.content,
          userMessage.allowAppChanges ?? false,
          userMessage.attachments,
        );
        if (!result.accepted) {
          const rejectionMessage: AssistantMessage = {
            author: MessageAuthor.Assistant,
            content: formatRejectionMessage(result),
            timestamp: new Date(),
            filesChanged: [],
          };
          replaceLoadingWithMessage(threadId, rejectionMessage);
        }
      } catch (error) {
        console.error('Workflow request failed:', error);
        const errorMessage: AssistantMessage = {
          author: MessageAuthor.Assistant,
          content:
            'Beklager, noe gikk galt under behandlingen av forespørselen din. Vennligst prøv igjen.',
          timestamp: new Date(),
          filesChanged: [],
        };
        replaceLoadingWithMessage(threadId, errorMessage);
      }
    },
    [addMessageToThread, replaceLoadingWithMessage, startAgentWorkflow],
  );

  const onSubmitMessage = useCallback(
    async (message: UserMessage): Promise<void> => {
      const trimmedContent = message.content?.trim();
      if (!trimmedContent) return;

      const userMessage: UserMessage = {
        ...message,
        content: trimmedContent,
        timestamp: new Date(),
      };

      if (currentSessionId) {
        await runWorkflowForSession(currentSessionId, userMessage);
        return;
      }

      if (!backendSessionId) {
        console.error('No backend session ID available - connection not established');
        return;
      }

      setCurrentSession(backendSessionId);
      await runWorkflowForSession(backendSessionId, userMessage);
    },
    [backendSessionId, currentSessionId, runWorkflowForSession, setCurrentSession],
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
    onSubmitMessage,
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
